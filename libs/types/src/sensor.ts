/**
 * Sensor framework types for AutoMaker.
 *
 * Sensors are external data reporters (e.g., user presence detectors, IoT devices,
 * CI environment probes) that push readings into the server via REST. Each sensor
 * registers itself with a unique id, then POSTs periodic data payloads. The server
 * stores the latest reading in-memory with TTL-based eviction.
 */

/** Opaque sensor identifier string */
export type SensorId = string;

/** Possible lifecycle states for a registered sensor */
export type SensorState = 'active' | 'stale' | 'offline';

/** Possible presence states reported by a user-presence sensor */
export type UserPresenceState = 'present' | 'away' | 'unknown';

/**
 * Configuration record stored in the SensorRegistryService when a sensor registers.
 * Mirrors the body of POST /api/sensors/register.
 */
export interface SensorConfig {
  /** Unique identifier for this sensor */
  id: SensorId;
  /** Human-readable name */
  name: string;
  /** Optional free-form description */
  description?: string;
  /** ISO-8601 timestamp of when the sensor was registered */
  registeredAt: string;
  /** ISO-8601 timestamp of the most recent reading, or undefined if none yet */
  lastSeenAt?: string;
}

/**
 * A single data payload received from a sensor via POST /api/sensors/report.
 * The `data` field is intentionally open so any sensor type can report arbitrary values.
 */
export interface SensorReading {
  /** Sensor that produced this reading */
  sensorId: SensorId;
  /** Arbitrary sensor payload (e.g. { presence: 'present', confidence: 0.92 }) */
  data: Record<string, unknown>;
  /** ISO-8601 timestamp when the reading was received by the server */
  receivedAt: string;
}

/** Options for querying historical sensor readings */
export interface SensorHistoryOptions {
  /** ISO-8601 start date filter (inclusive) */
  startDate?: string;
  /** ISO-8601 end date filter (inclusive) */
  endDate?: string;
  /** Maximum number of readings to return (default: 100) */
  limit?: number;
}

/** Aggregation interval for sensor history */
export type SensorAggregationInterval = 'hour' | 'day' | 'week';

/** Options for querying aggregated sensor history */
export interface SensorHistoryAggregatedOptions {
  /** Aggregation bucket size */
  interval: SensorAggregationInterval;
  /** JSON field name to aggregate (e.g. 'temperature', 'kWh') */
  field: string;
  /** ISO-8601 start date filter (inclusive) */
  startDate?: string;
  /** ISO-8601 end date filter (inclusive) */
  endDate?: string;
}

/** Valid actions that can be pushed to an IoT device */
export type SensorCommandAction = 'set' | 'toggle' | 'reboot';

/**
 * A command queued for delivery to an IoT device.
 * Devices retrieve pending commands by polling GET /api/sensors/:id/commands.
 */
export interface SensorCommand {
  /** Unique command identifier */
  id: string;
  /** Target sensor that should execute this command */
  sensorId: SensorId;
  /** Action the device should perform */
  action: SensorCommandAction;
  /** Optional action-specific parameters */
  payload?: Record<string, unknown>;
  /** ISO-8601 timestamp when the command was queued */
  queuedAt: string;
}

/** A single aggregated data point for a time period */
export interface AggregatedSensorReading {
  /** Start of the aggregation period (ISO-8601) */
  period: string;
  /** Average value in this period */
  avg: number;
  /** Minimum value in this period */
  min: number;
  /** Maximum value in this period */
  max: number;
  /** Number of readings in this period */
  count: number;
}
