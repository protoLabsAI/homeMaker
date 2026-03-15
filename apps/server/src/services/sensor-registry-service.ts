/**
 * SensorRegistryService — In-memory registry for external sensors.
 *
 * Follows the RoleRegistry pattern: sensors register themselves with a unique id,
 * then POST periodic data payloads. The latest reading for each sensor is stored
 * in-memory. Readings older than TTL_MS are considered stale.
 *
 * Built-in sensors registered at startup:
 *   builtin:websocket-clients — tracks connected WebSocket client count (detects headless mode)
 *   builtin:electron-idle     — reports system idle time via Electron powerMonitor (Electron only)
 *
 * Events emitted:
 *   sensor:registered   — when a new sensor is registered
 *   sensor:data-received — when a sensor reports a reading
 */

import { createLogger } from '@protolabsai/utils';
import crypto from 'node:crypto';
import type * as BetterSqlite3 from 'better-sqlite3';
import type {
  SensorConfig,
  SensorReading,
  SensorState,
  SensorHistoryOptions,
  SensorHistoryAggregatedOptions,
  AggregatedSensorReading,
  SensorCommand,
  SensorCommandAction,
} from '@protolabsai/types';
import type { EventEmitter } from '../lib/events.js';

const logger = createLogger('SensorRegistry');

/** Default number of days to retain sensor readings in the database */
const DEFAULT_RETENTION_DAYS = 90;

/** Row shape returned by SQLite for sensor_readings queries */
interface SensorReadingRow {
  sensorId: string;
  data: string;
  receivedAt: string;
}

/** Row shape returned by SQLite for aggregated sensor readings queries */
interface AggregatedRow {
  period: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Polling interval for builtin:electron-idle (30 seconds) */
const ELECTRON_IDLE_POLL_MS = 30_000;

/** How long after the last reading a sensor is considered "stale" (5 minutes) */
const STALE_TTL_MS = 5 * 60 * 1000;

/** How long after the last reading a sensor is considered "offline" (15 minutes) */
const OFFLINE_TTL_MS = 15 * 60 * 1000;

export class SensorRegistryService {
  private sensors = new Map<string, SensorConfig>();
  private readings = new Map<string, SensorReading>();
  private commandQueue = new Map<string, SensorCommand[]>();
  private events?: EventEmitter;
  private db?: BetterSqlite3.Database;

  /** Current tracked WebSocket client count for the builtin:websocket-clients sensor */
  private _wsClientCount = 0;

  /** Interval handle for the Electron idle time poller */
  private _electronIdleInterval?: ReturnType<typeof setInterval>;

  constructor(events?: EventEmitter, db?: BetterSqlite3.Database) {
    this.events = events;
    this.db = db;
  }

  /**
   * Register both built-in sensors and start their reporting loops.
   * Safe to call multiple times — re-registration is idempotent.
   */
  startBuiltinSensors(): void {
    // ── builtin:websocket-clients ────────────────────────────────────────────
    this.register({
      id: 'builtin:websocket-clients',
      name: 'WebSocket Clients',
      description:
        'Tracks the number of connected WebSocket UI clients. Count of 0 indicates headless (server-only) mode.',
    });
    // Report the initial count (0 at startup — clients haven't connected yet)
    this._reportWebSocketClients();

    // ── builtin:electron-idle ────────────────────────────────────────────────
    this.register({
      id: 'builtin:electron-idle',
      name: 'Electron Idle Time',
      description:
        'Reports system idle time in seconds via Electron powerMonitor.getSystemIdleTime(). Only active when running inside Electron.',
    });
    this._startElectronIdlePoller();

    logger.info('Built-in sensors registered (websocket-clients, electron-idle)');
  }

  /**
   * Update the WebSocket client count and immediately report to the builtin sensor.
   * Called by the WebSocket server whenever a client connects or disconnects.
   */
  notifyWebSocketClientCount(count: number): void {
    this._wsClientCount = Math.max(0, count);
    this._reportWebSocketClients();
  }

  /** Internal helper: report current WS client count to the builtin sensor */
  private _reportWebSocketClients(): void {
    this.report({
      sensorId: 'builtin:websocket-clients',
      data: { clientCount: this._wsClientCount },
    });
  }

  /**
   * Start a polling interval that reads system idle time from Electron's powerMonitor.
   * If not running inside Electron the dynamic import fails silently and no readings
   * are produced (the sensor stays offline / stale).
   */
  private _startElectronIdlePoller(): void {
    if (this._electronIdleInterval) return; // already started

    const poll = async () => {
      try {
        // Dynamic import: only works inside Electron renderer / main processes
        // eslint-disable-next-line n/no-extraneous-import
        const electron = await import('electron');
        const powerMonitor =
          electron.powerMonitor ?? (electron as unknown as Record<string, unknown>).default;
        if (
          powerMonitor &&
          typeof (powerMonitor as { getSystemIdleTime?: () => number }).getSystemIdleTime ===
            'function'
        ) {
          const idleSeconds = (
            powerMonitor as { getSystemIdleTime: () => number }
          ).getSystemIdleTime();
          this.report({
            sensorId: 'builtin:electron-idle',
            data: { idleSeconds },
          });
        }
      } catch {
        // Electron not available — no-op (sensor remains offline / stale)
      }
    };

    // Run once immediately, then on the interval
    void poll();
    this._electronIdleInterval = setInterval(() => void poll(), ELECTRON_IDLE_POLL_MS);
  }

  /** Stop built-in sensor polling loops (for clean shutdown). */
  stopBuiltinSensors(): void {
    if (this._electronIdleInterval) {
      clearInterval(this._electronIdleInterval);
      this._electronIdleInterval = undefined;
    }
  }

  /**
   * Register a new sensor. If a sensor with the same id already exists it is
   * updated (re-registration is idempotent — useful for sensor restarts).
   */
  register(input: { id: string; name: string; description?: string }): {
    success: boolean;
    sensor?: SensorConfig;
    error?: string;
  } {
    if (!input.id || typeof input.id !== 'string' || !input.id.trim()) {
      return { success: false, error: 'Sensor id is required and must be a non-empty string' };
    }

    if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
      return { success: false, error: 'Sensor name is required and must be a non-empty string' };
    }

    const existing = this.sensors.get(input.id);
    const registeredAt = existing?.registeredAt ?? new Date().toISOString();

    const sensor: SensorConfig = {
      id: input.id.trim(),
      name: input.name.trim(),
      description: input.description?.trim(),
      registeredAt,
      lastSeenAt: existing?.lastSeenAt,
    };

    this.sensors.set(sensor.id, sensor);

    logger.info(`Sensor registered: "${sensor.id}" (${sensor.name})`);

    this.events?.emit('sensor:registered', {
      sensorId: sensor.id,
      name: sensor.name,
      registeredAt: sensor.registeredAt,
    });

    return { success: true, sensor };
  }

  /**
   * Record a data reading from a sensor.
   * The sensor must already be registered.
   */
  report(input: { sensorId: string; data: Record<string, unknown> }): {
    success: boolean;
    reading?: SensorReading;
    error?: string;
  } {
    const sensor = this.sensors.get(input.sensorId);
    if (!sensor) {
      return {
        success: false,
        error: `Sensor "${input.sensorId}" is not registered. Call POST /api/sensors/register first.`,
      };
    }

    const receivedAt = new Date().toISOString();

    const reading: SensorReading = {
      sensorId: input.sensorId,
      data: input.data,
      receivedAt,
    };

    // Store the latest reading (replaces previous)
    this.readings.set(input.sensorId, reading);

    // Persist to SQLite history table if DB is available
    if (this.db) {
      try {
        this.db
          .prepare(
            'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
          )
          .run(input.sensorId, JSON.stringify(input.data), receivedAt);
      } catch (err) {
        logger.warn(`Failed to persist reading for sensor "${input.sensorId}":`, err);
      }
    }

    // Update sensor's lastSeenAt
    sensor.lastSeenAt = receivedAt;
    this.sensors.set(sensor.id, sensor);

    logger.debug(`Sensor data received from "${input.sensorId}"`);

    this.events?.emit('sensor:data-received', {
      sensorId: input.sensorId,
      data: input.data,
      receivedAt,
    });

    return { success: true, reading };
  }

  /**
   * Get the current state of a sensor based on how long ago it last reported.
   */
  getState(sensorId: string): SensorState {
    const sensor = this.sensors.get(sensorId);
    if (!sensor || !sensor.lastSeenAt) return 'offline';

    const ageMs = Date.now() - new Date(sensor.lastSeenAt).getTime();
    if (ageMs > OFFLINE_TTL_MS) return 'offline';
    if (ageMs > STALE_TTL_MS) return 'stale';
    return 'active';
  }

  /**
   * Get the config and latest reading for a single sensor.
   */
  get(
    sensorId: string
  ): { sensor: SensorConfig; reading?: SensorReading; state: SensorState } | undefined {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) return undefined;

    return {
      sensor,
      reading: this.readings.get(sensorId),
      state: this.getState(sensorId),
    };
  }

  /**
   * List all registered sensors with their latest readings and computed state.
   */
  getAll(): Array<{ sensor: SensorConfig; reading?: SensorReading; state: SensorState }> {
    return Array.from(this.sensors.values()).map((sensor) => ({
      sensor,
      reading: this.readings.get(sensor.id),
      state: this.getState(sensor.id),
    }));
  }

  /**
   * Number of registered sensors.
   */
  get size(): number {
    return this.sensors.size;
  }

  /**
   * Query historical sensor readings from the SQLite sensor_readings table.
   * Returns readings sorted by receivedAt descending (most recent first).
   */
  getHistory(sensorId: string, options?: SensorHistoryOptions): SensorReading[] {
    if (!this.db) {
      return [];
    }

    const limit = options?.limit ?? 100;
    const conditions: string[] = ['sensorId = ?'];
    const params: (string | number)[] = [sensorId];

    if (options?.startDate) {
      conditions.push('receivedAt >= ?');
      params.push(options.startDate);
    }
    if (options?.endDate) {
      conditions.push('receivedAt <= ?');
      params.push(options.endDate);
    }

    const sql = `SELECT sensorId, data, receivedAt FROM sensor_readings WHERE ${conditions.join(' AND ')} ORDER BY receivedAt DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as SensorReadingRow[];
    return rows.map((row) => ({
      sensorId: row.sensorId,
      data: JSON.parse(row.data) as Record<string, unknown>,
      receivedAt: row.receivedAt,
    }));
  }

  /**
   * Query aggregated sensor history for a specific numeric field.
   * Groups readings by the specified interval and computes avg/min/max/count.
   */
  getHistoryAggregated(
    sensorId: string,
    options: SensorHistoryAggregatedOptions
  ): AggregatedSensorReading[] {
    if (!this.db) {
      return [];
    }

    const { interval, field, startDate, endDate } = options;

    // Build the strftime format for grouping by interval
    let strftimeFmt: string;
    switch (interval) {
      case 'hour':
        strftimeFmt = '%Y-%m-%dT%H:00:00';
        break;
      case 'day':
        strftimeFmt = '%Y-%m-%d';
        break;
      case 'week':
        // ISO week: group by year + week number (Monday-based)
        strftimeFmt = '%Y-W%W';
        break;
      default:
        return [];
    }

    const conditions: string[] = ['sensorId = ?'];
    const params: (string | number)[] = [sensorId];

    if (startDate) {
      conditions.push('receivedAt >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('receivedAt <= ?');
      params.push(endDate);
    }

    // Use json_extract to pull the numeric field from the data column.
    // Rows where the field is missing or non-numeric are excluded by the HAVING count > 0 check.
    const jsonPath = `$.${field}`;
    const sql = `
      SELECT
        strftime('${strftimeFmt}', receivedAt) AS period,
        AVG(CAST(json_extract(data, ?) AS REAL)) AS avg,
        MIN(CAST(json_extract(data, ?) AS REAL)) AS min,
        MAX(CAST(json_extract(data, ?) AS REAL)) AS max,
        COUNT(*) AS count
      FROM sensor_readings
      WHERE ${conditions.join(' AND ')}
        AND json_extract(data, ?) IS NOT NULL
        AND typeof(json_extract(data, ?)) IN ('integer', 'real')
      GROUP BY period
      ORDER BY period DESC
    `;

    const rows = this.db
      .prepare(sql)
      .all(jsonPath, jsonPath, jsonPath, ...params, jsonPath, jsonPath) as AggregatedRow[];

    return rows.map((row) => ({
      period: row.period,
      avg: row.avg,
      min: row.min,
      max: row.max,
      count: row.count,
    }));
  }

  /**
   * Delete sensor readings older than the configured retention period.
   * Called by the scheduler as a periodic cleanup job.
   */
  cleanupOldReadings(): { deleted: number } {
    if (!this.db) {
      return { deleted: 0 };
    }

    const retentionDays = parseInt(
      process.env.SENSOR_HISTORY_RETENTION_DAYS ?? String(DEFAULT_RETENTION_DAYS),
      10
    );
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const result = this.db.prepare('DELETE FROM sensor_readings WHERE receivedAt < ?').run(cutoff);

    const deleted = result.changes;
    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} sensor readings older than ${retentionDays} days`);
    }

    return { deleted };
  }

  /**
   * Queue a command for delivery to an IoT device.
   * The sensor must already be registered.
   */
  queueCommand(
    sensorId: string,
    commandData: { action: SensorCommandAction; payload?: Record<string, unknown> }
  ): { success: boolean; command?: SensorCommand; error?: string } {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) {
      return {
        success: false,
        error: `Sensor "${sensorId}" is not registered`,
      };
    }

    const command: SensorCommand = {
      id: crypto.randomUUID(),
      sensorId,
      action: commandData.action,
      payload: commandData.payload,
      queuedAt: new Date().toISOString(),
    };

    const queue = this.commandQueue.get(sensorId) ?? [];
    queue.push(command);
    this.commandQueue.set(sensorId, queue);

    logger.info(`Command queued for sensor "${sensorId}": ${command.action} (${command.id})`);

    this.events?.emit('sensor:command-queued', {
      commandId: command.id,
      sensorId,
      action: command.action,
      queuedAt: command.queuedAt,
    });

    return { success: true, command };
  }

  /**
   * Retrieve and clear all pending commands for a sensor.
   * IoT devices call this endpoint to poll for work.
   */
  pollCommands(sensorId: string): { success: boolean; commands?: SensorCommand[]; error?: string } {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) {
      return {
        success: false,
        error: `Sensor "${sensorId}" is not registered`,
      };
    }

    const commands = this.commandQueue.get(sensorId) ?? [];
    this.commandQueue.set(sensorId, []);

    logger.debug(`Polled ${commands.length} command(s) for sensor "${sensorId}"`);

    return { success: true, commands };
  }
}
