/**
 * Home Assistant client types — WebSocket integration with HA instance.
 */

/** Configuration for connecting to a Home Assistant instance */
export interface HaClientConfig {
  /** WebSocket URL, e.g. "ws://homeassistant.local:8123/api/websocket" */
  url: string;
  /** Long-lived access token generated in HA user profile */
  token: string;
}

/** Current connection state of the HA client */
export type HaConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'auth_failed';

/** State of a single Home Assistant entity */
export interface HaEntityState {
  /** Full entity ID, e.g. "light.living_room" */
  entityId: string;
  /** Current state string, e.g. "on", "off", "23.5" */
  state: string;
  /** All entity attributes from HA */
  attributes: Record<string, unknown>;
  /** ISO-8601 timestamp of last state change */
  lastUpdated: string;
  /** Friendly name from attributes, if present */
  friendlyName?: string;
  /** Domain portion of entityId, e.g. "light", "sensor", "switch" */
  domain: string;
}

/** Summary of the HA client connection and entity registry */
export interface HaClientStatus {
  status: HaConnectionStatus;
  url?: string;
  entityCount: number;
  connectedAt?: string;
  lastError?: string;
}
