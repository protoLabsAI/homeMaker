/**
 * HAClientService — WebSocket client for Home Assistant.
 *
 * Connects to a Home Assistant instance via the HA WebSocket API, authenticates
 * with a long-lived access token, subscribes to state_changed events, and
 * auto-registers discovered HA entities as homeMaker sensors via SensorRegistryService.
 *
 * Configuration is read from environment variables at startup and can be
 * overridden at runtime via the connect() method:
 *   HA_URL   — WebSocket URL, e.g. "ws://homeassistant.local:8123/api/websocket"
 *   HA_TOKEN — Long-lived access token generated in HA user profile
 *
 * Events emitted:
 *   ha:connected         — WebSocket authenticated and subscribed
 *   ha:disconnected      — Connection closed (includes reconnect info)
 *   ha:entity-registered — New HA entity registered as a homeMaker sensor
 *   ha:state-changed     — Entity state changed (forwarded from HA)
 */

import WebSocket from 'ws';
import { createLogger } from '@protolabsai/utils';
import type {
  HaClientConfig,
  HaConnectionStatus,
  HaEntityState,
  HaClientStatus,
} from '@protolabsai/types';
import type { SensorRegistryService } from './sensor-registry-service.js';
import type { EventEmitter } from '../lib/events.js';

const logger = createLogger('HAClientService');

/** Minimum reconnect delay in ms */
const RECONNECT_MIN_MS = 1_000;
/** Maximum reconnect delay in ms (exponential backoff cap) */
const RECONNECT_MAX_MS = 60_000;
/** Subscription message ID for state_changed events */
const SUBSCRIBE_ID = 1;
/** Get states message ID for initial entity load */
const GET_STATES_ID = 2;

/** Raw HA state object from the WebSocket API */
interface HaRawState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated: string;
}

/** HA WebSocket message type */
interface HaMessage {
  type: string;
  id?: number;
  ha_version?: string;
  message?: string;
  success?: boolean;
  result?: HaRawState[];
  event?: {
    event_type: string;
    data?: {
      entity_id?: string;
      new_state?: HaRawState;
    };
  };
}

export class HAClientService {
  private ws: WebSocket | null = null;
  private config: HaClientConfig | null = null;
  private status: HaConnectionStatus = 'disconnected';
  private entities = new Map<string, HaEntityState>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectedAt: string | null = null;
  private lastError: string | null = null;
  private _destroyed = false;

  constructor(
    private readonly sensorRegistryService: SensorRegistryService,
    private readonly events?: EventEmitter
  ) {
    // Auto-connect from environment variables if both are set
    const url = process.env.HA_URL;
    const token = process.env.HA_TOKEN;
    if (url && token) {
      logger.info(`Auto-connecting to Home Assistant at ${url}`);
      void this.connect({ url, token });
    } else {
      logger.info(
        'HA_URL / HA_TOKEN not set — Home Assistant integration disabled. ' +
          'Use POST /api/integrations/ha/connect to configure at runtime.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Connect (or reconnect) to Home Assistant with the given config.
   * Disconnects any existing connection first.
   */
  async connect(config: HaClientConfig): Promise<void> {
    this._cancelReconnect();
    this._closeSocket();

    this.config = config;
    this.reconnectAttempts = 0;
    this._destroyed = false;
    this._openSocket();
  }

  /** Disconnect from Home Assistant and stop all reconnect attempts. */
  disconnect(): void {
    this._destroyed = true;
    this._cancelReconnect();
    this._closeSocket();
    this._setStatus('disconnected');
    logger.info('Disconnected from Home Assistant (manual)');
  }

  /** Return current connection status summary. */
  getStatus(): HaClientStatus {
    return {
      status: this.status,
      url: this.config?.url,
      entityCount: this.entities.size,
      connectedAt: this.connectedAt ?? undefined,
      lastError: this.lastError ?? undefined,
    };
  }

  /** Return all currently known entity states. */
  getEntities(): HaEntityState[] {
    return Array.from(this.entities.values());
  }

  // ---------------------------------------------------------------------------
  // Internal — WebSocket lifecycle
  // ---------------------------------------------------------------------------

  private _openSocket(): void {
    if (!this.config) return;

    this._setStatus(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
    logger.info(
      `Connecting to Home Assistant at ${this.config.url} (attempt ${this.reconnectAttempts + 1})`
    );

    try {
      this.ws = new WebSocket(this.config.url);
    } catch (err) {
      logger.error('Failed to create WebSocket:', err);
      this.lastError = String(err);
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      logger.debug('WebSocket connection opened, waiting for auth_required');
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as HaMessage;
        this._handleMessage(msg);
      } catch (err) {
        logger.warn('Failed to parse HA message:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      const reasonStr = reason.toString() || 'unknown';
      logger.info(`WebSocket closed (code=${code}, reason=${reasonStr})`);
      this.ws = null;

      if (this.status === 'connected') {
        this.connectedAt = null;
        this.events?.emit('ha:disconnected', { code, reason: reasonStr });
      }

      if (!this._destroyed) {
        this._scheduleReconnect();
      } else {
        this._setStatus('disconnected');
      }
    });

    this.ws.on('error', (err: Error) => {
      logger.error('WebSocket error:', err.message);
      this.lastError = err.message;
    });
  }

  private _handleMessage(msg: HaMessage): void {
    switch (msg.type) {
      case 'auth_required':
        logger.debug('HA auth_required received, sending token');
        this._send({ type: 'auth', access_token: this.config!.token });
        break;

      case 'auth_ok':
        logger.info(`Authenticated with Home Assistant (version ${msg.ha_version ?? 'unknown'})`);
        this.reconnectAttempts = 0;
        this.lastError = null;
        this.connectedAt = new Date().toISOString();
        this._setStatus('connected');
        this.events?.emit('ha:connected', { url: this.config!.url, version: msg.ha_version });
        // Fetch all current states then subscribe to future changes
        this._send({ id: GET_STATES_ID, type: 'get_states' });
        this._send({ id: SUBSCRIBE_ID, type: 'subscribe_events', event_type: 'state_changed' });
        break;

      case 'auth_invalid':
        logger.error(`HA authentication failed: ${msg.message ?? 'invalid token'}`);
        this.lastError = msg.message ?? 'invalid token';
        this._setStatus('auth_failed');
        this._destroyed = true; // Don't reconnect on auth failure
        this._closeSocket();
        break;

      case 'result':
        if (msg.id === GET_STATES_ID && msg.success && Array.isArray(msg.result)) {
          logger.info(`Received ${msg.result.length} initial entity states from Home Assistant`);
          for (const rawState of msg.result) {
            this._upsertEntity(rawState);
          }
        }
        break;

      case 'event':
        if (msg.event?.event_type === 'state_changed' && msg.event.data?.new_state) {
          this._handleStateChanged(msg.event.data.new_state);
        }
        break;

      default:
        // Ignore heartbeat pong and other internal messages
        break;
    }
  }

  private _handleStateChanged(newState: HaRawState): void {
    const isNew = !this.entities.has(newState.entity_id);
    const entity = this._upsertEntity(newState);

    this.events?.emit('ha:state-changed', {
      entityId: entity.entityId,
      state: entity.state,
      attributes: entity.attributes,
    });

    if (isNew) {
      logger.debug(`New HA entity discovered: ${entity.entityId}`);
    }

    // Forward to sensor registry
    this.sensorRegistryService.report({
      sensorId: `ha:${entity.entityId}`,
      data: {
        state: entity.state,
        attributes: entity.attributes,
        lastUpdated: entity.lastUpdated,
      },
    });
  }

  private _upsertEntity(raw: HaRawState): HaEntityState {
    const domain = raw.entity_id.split('.')[0] ?? 'unknown';
    const friendlyName =
      typeof raw.attributes['friendly_name'] === 'string'
        ? raw.attributes['friendly_name']
        : undefined;

    const entity: HaEntityState = {
      entityId: raw.entity_id,
      state: raw.state,
      attributes: raw.attributes,
      lastUpdated: raw.last_updated,
      friendlyName,
      domain,
    };

    const isNew = !this.entities.has(raw.entity_id);
    this.entities.set(raw.entity_id, entity);

    if (isNew) {
      // Register as a homeMaker sensor
      this.sensorRegistryService.register({
        id: `ha:${raw.entity_id}`,
        name: friendlyName ?? raw.entity_id,
        description: `Home Assistant ${domain} entity (${raw.entity_id})`,
      });

      this.events?.emit('ha:entity-registered', {
        entityId: raw.entity_id,
        domain,
        friendlyName,
      });
    }

    return entity;
  }

  // ---------------------------------------------------------------------------
  // Internal — helpers
  // ---------------------------------------------------------------------------

  private _send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private _closeSocket(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
  }

  private _cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_MIN_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;
    logger.info(`Reconnecting to Home Assistant in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this._destroyed && this.config) {
        this._openSocket();
      }
    }, delay);
  }

  private _setStatus(status: HaConnectionStatus): void {
    this.status = status;
  }
}
