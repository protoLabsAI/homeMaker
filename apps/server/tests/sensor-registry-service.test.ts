/**
 * Unit tests for SensorRegistryService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { SensorRegistryService } from '../src/services/sensor-registry-service.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      sensorId TEXT NOT NULL,
      data TEXT NOT NULL,
      receivedAt TEXT NOT NULL,
      PRIMARY KEY (sensorId, receivedAt)
    );
  `);

  return db;
}

describe('SensorRegistryService', () => {
  let db: BetterSqlite3.Database;
  let service: SensorRegistryService;

  beforeEach(() => {
    db = createTestDb();
    service = new SensorRegistryService(undefined, db);
  });

  afterEach(() => {
    db.close();
  });

  // ── register ─────────────────────────────────────────────────────────────

  it('registers a new sensor successfully', () => {
    const result = service.register({ id: 'temp-sensor-1', name: 'Temperature Sensor' });
    expect(result.success).toBe(true);
    expect(result.sensor).toBeDefined();
    expect(result.sensor?.id).toBe('temp-sensor-1');
    expect(result.sensor?.name).toBe('Temperature Sensor');
    expect(result.sensor?.registeredAt).toBeTruthy();
  });

  it('returns error when id is missing', () => {
    const result = service.register({ id: '', name: 'Bad Sensor' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/id is required/);
  });

  it('returns error when name is missing', () => {
    const result = service.register({ id: 'sensor-x', name: '' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name is required/);
  });

  it('trims whitespace from id and name', () => {
    const result = service.register({ id: '  trim-id  ', name: '  Trim Name  ' });
    expect(result.success).toBe(true);
    expect(result.sensor?.id).toBe('trim-id');
    expect(result.sensor?.name).toBe('Trim Name');
  });

  it('registration is idempotent — re-registering updates name without changing registeredAt', () => {
    const first = service.register({ id: 'my-sensor', name: 'Original Name' });
    const originalTs = first.sensor?.registeredAt;

    const second = service.register({ id: 'my-sensor', name: 'Updated Name' });
    expect(second.success).toBe(true);
    expect(second.sensor?.name).toBe('Updated Name');
    expect(second.sensor?.registeredAt).toBe(originalTs);
  });

  it('stores optional description', () => {
    const result = service.register({
      id: 'desc-sensor',
      name: 'With Description',
      description: 'This is a test sensor',
    });
    expect(result.sensor?.description).toBe('This is a test sensor');
  });

  it('tracks size after registrations', () => {
    service.register({ id: 'a', name: 'A' });
    service.register({ id: 'b', name: 'B' });
    service.register({ id: 'c', name: 'C' });
    expect(service.size).toBe(3);
  });

  // ── report ────────────────────────────────────────────────────────────────

  it('reports a reading for a registered sensor', () => {
    service.register({ id: 'humidity-1', name: 'Humidity' });
    const result = service.report({ sensorId: 'humidity-1', data: { humidity: 65 } });

    expect(result.success).toBe(true);
    expect(result.reading).toBeDefined();
    expect(result.reading?.sensorId).toBe('humidity-1');
    expect(result.reading?.data).toEqual({ humidity: 65 });
    expect(result.reading?.receivedAt).toBeTruthy();
  });

  it('returns error when reporting for unregistered sensor', () => {
    const result = service.report({ sensorId: 'not-registered', data: { value: 1 } });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not registered/);
  });

  it('persists reading to SQLite when db is provided', () => {
    service.register({ id: 'persist-sensor', name: 'Persist' });
    service.report({ sensorId: 'persist-sensor', data: { temp: 22 } });

    const row = db
      .prepare("SELECT * FROM sensor_readings WHERE sensorId = 'persist-sensor'")
      .get() as { sensorId: string; data: string } | undefined;

    expect(row).toBeDefined();
    expect(JSON.parse(row!.data)).toEqual({ temp: 22 });
  });

  it('updates sensor lastSeenAt on report', () => {
    service.register({ id: 'seen-sensor', name: 'Seen' });
    service.report({ sensorId: 'seen-sensor', data: { x: 1 } });

    const entry = service.get('seen-sensor');
    expect(entry?.sensor.lastSeenAt).toBeTruthy();
  });

  it('stores only the latest reading in memory', () => {
    service.register({ id: 'rolling-sensor', name: 'Rolling' });
    service.report({ sensorId: 'rolling-sensor', data: { val: 1 } });
    service.report({ sensorId: 'rolling-sensor', data: { val: 2 } });
    service.report({ sensorId: 'rolling-sensor', data: { val: 3 } });

    const entry = service.get('rolling-sensor');
    expect(entry?.reading?.data).toEqual({ val: 3 });
  });

  // ── getState ──────────────────────────────────────────────────────────────

  it('returns "offline" for unregistered sensor', () => {
    expect(service.getState('ghost-sensor')).toBe('offline');
  });

  it('returns "offline" for sensor with no readings', () => {
    service.register({ id: 'no-read', name: 'No Read' });
    expect(service.getState('no-read')).toBe('offline');
  });

  it('returns "active" for sensor that just reported', () => {
    service.register({ id: 'active-sensor', name: 'Active' });
    service.report({ sensorId: 'active-sensor', data: {} });
    expect(service.getState('active-sensor')).toBe('active');
  });

  it('returns "stale" for sensor whose last reading was 6 minutes ago', () => {
    service.register({ id: 'stale-sensor', name: 'Stale' });
    service.report({ sensorId: 'stale-sensor', data: {} });

    // Manually backdate lastSeenAt to 6 minutes ago
    const sensor = service.get('stale-sensor')!.sensor;
    sensor.lastSeenAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    expect(service.getState('stale-sensor')).toBe('stale');
  });

  it('returns "offline" for sensor whose last reading was 20 minutes ago', () => {
    service.register({ id: 'offline-sensor', name: 'Offline' });
    service.report({ sensorId: 'offline-sensor', data: {} });

    const sensor = service.get('offline-sensor')!.sensor;
    sensor.lastSeenAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    expect(service.getState('offline-sensor')).toBe('offline');
  });

  // ── get / getAll ─────────────────────────────────────────────────────────

  it('returns undefined for unknown sensor in get()', () => {
    expect(service.get('unknown')).toBeUndefined();
  });

  it('returns sensor config and reading in get()', () => {
    service.register({ id: 'get-sensor', name: 'Get Test' });
    service.report({ sensorId: 'get-sensor', data: { foo: 'bar' } });

    const entry = service.get('get-sensor');
    expect(entry).toBeDefined();
    expect(entry?.sensor.id).toBe('get-sensor');
    expect(entry?.reading?.data).toEqual({ foo: 'bar' });
    expect(entry?.state).toBe('active');
  });

  it('getAll() returns all registered sensors', () => {
    service.register({ id: 'x1', name: 'X1' });
    service.register({ id: 'x2', name: 'X2' });
    service.register({ id: 'x3', name: 'X3' });

    const all = service.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.sensor.id).sort()).toEqual(['x1', 'x2', 'x3']);
  });

  // ── getHistory ────────────────────────────────────────────────────────────

  it('returns empty array when no db is provided', () => {
    const noDbService = new SensorRegistryService();
    noDbService.register({ id: 's1', name: 'S1' });
    expect(noDbService.getHistory('s1')).toEqual([]);
  });

  it('retrieves persisted readings from history', () => {
    service.register({ id: 'hist-sensor', name: 'History' });

    // Insert directly with unique timestamps
    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('hist-sensor', JSON.stringify({ temp: 20 }), '2025-01-15T10:00:00.000Z');
    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('hist-sensor', JSON.stringify({ temp: 21 }), '2025-01-15T10:01:00.000Z');

    const history = service.getHistory('hist-sensor');
    expect(history.length).toBe(2);
    expect(history[0]?.data).toEqual({ temp: 21 }); // most recent first
  });

  it('respects limit option in getHistory', () => {
    service.register({ id: 'limit-sensor', name: 'Limit' });

    for (let i = 0; i < 5; i++) {
      db.prepare(
        'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
      ).run('limit-sensor', JSON.stringify({ i }), new Date(Date.now() + i * 1000).toISOString());
    }

    const history = service.getHistory('limit-sensor', { limit: 2 });
    expect(history.length).toBe(2);
  });

  it('filters history by startDate and endDate', () => {
    service.register({ id: 'date-sensor', name: 'DateFilter' });

    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('date-sensor', '{"v":1}', '2025-01-15T11:00:00.000Z');

    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('date-sensor', '{"v":2}', '2025-01-15T12:00:00.000Z');

    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('date-sensor', '{"v":3}', '2025-01-15T13:00:00.000Z');

    const history = service.getHistory('date-sensor', {
      startDate: '2025-01-15T12:00:00.000Z',
      endDate: '2025-01-15T13:00:00.000Z',
    });

    expect(history.length).toBe(2);
  });

  // ── getHistoryAggregated ──────────────────────────────────────────────────

  it('returns empty array when no db is provided for aggregated history', () => {
    const noDbService = new SensorRegistryService();
    noDbService.register({ id: 's1', name: 'S1' });
    expect(noDbService.getHistoryAggregated('s1', { interval: 'hour', field: 'temp' })).toEqual([]);
  });

  it('aggregates readings by hour', () => {
    service.register({ id: 'agg-sensor', name: 'Agg' });

    const readings = [
      { temp: 20, ts: '2025-01-15T10:00:00.000Z' },
      { temp: 22, ts: '2025-01-15T10:30:00.000Z' },
      { temp: 24, ts: '2025-01-15T11:00:00.000Z' },
    ];

    for (const r of readings) {
      db.prepare(
        'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
      ).run('agg-sensor', JSON.stringify({ temp: r.temp }), r.ts);
    }

    const agg = service.getHistoryAggregated('agg-sensor', { interval: 'hour', field: 'temp' });
    expect(agg.length).toBeGreaterThan(0);
    const hourBucket = agg.find((a) => a.period.includes('T10:'));
    expect(hourBucket).toBeDefined();
    expect(hourBucket?.avg).toBeCloseTo(21); // avg of 20 and 22
    expect(hourBucket?.min).toBe(20);
    expect(hourBucket?.max).toBe(22);
    expect(hourBucket?.count).toBe(2);
  });

  // ── cleanupOldReadings ────────────────────────────────────────────────────

  it('returns 0 deleted when no db is provided', () => {
    const noDbService = new SensorRegistryService();
    expect(noDbService.cleanupOldReadings()).toEqual({ deleted: 0 });
  });

  it('deletes readings older than retention period', () => {
    service.register({ id: 'cleanup-sensor', name: 'Cleanup' });

    // Insert an old reading (100 days ago)
    const oldTs = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('cleanup-sensor', '{"old":true}', oldTs);

    // Insert a fresh reading
    const newTs = new Date().toISOString();
    db.prepare(
      'INSERT OR IGNORE INTO sensor_readings (sensorId, data, receivedAt) VALUES (?, ?, ?)'
    ).run('cleanup-sensor', '{"fresh":true}', newTs);

    const result = service.cleanupOldReadings();
    expect(result.deleted).toBe(1);

    const remaining = db
      .prepare('SELECT COUNT(*) as count FROM sensor_readings WHERE sensorId = ?')
      .get('cleanup-sensor') as { count: number };
    expect(remaining.count).toBe(1);
  });

  // ── queueCommand / pollCommands ───────────────────────────────────────────

  it('queues a command for a registered sensor', () => {
    service.register({ id: 'cmd-sensor', name: 'Cmd' });
    const result = service.queueCommand('cmd-sensor', { action: 'set', payload: { on: true } });

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('set');
    expect(result.command?.payload).toEqual({ on: true });
    expect(result.command?.id).toBeTruthy();
  });

  it('returns error when queuing for unregistered sensor', () => {
    const result = service.queueCommand('ghost', { action: 'reboot' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not registered/);
  });

  it('pollCommands returns all pending commands and clears the queue', () => {
    service.register({ id: 'poll-sensor', name: 'Poll' });
    service.queueCommand('poll-sensor', { action: 'set' });
    service.queueCommand('poll-sensor', { action: 'toggle' });

    const poll1 = service.pollCommands('poll-sensor');
    expect(poll1.success).toBe(true);
    expect(poll1.commands).toHaveLength(2);

    // Queue should now be empty
    const poll2 = service.pollCommands('poll-sensor');
    expect(poll2.commands).toHaveLength(0);
  });

  it('pollCommands returns error for unregistered sensor', () => {
    const result = service.pollCommands('unknown-sensor');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not registered/);
  });

  // ── startBuiltinSensors / stopBuiltinSensors ──────────────────────────────

  it('startBuiltinSensors registers the two builtin sensors', () => {
    service.startBuiltinSensors();
    expect(service.get('builtin:websocket-clients')).toBeDefined();
    expect(service.get('builtin:electron-idle')).toBeDefined();
  });

  it('notifyWebSocketClientCount updates the builtin sensor reading', () => {
    service.startBuiltinSensors();
    service.notifyWebSocketClientCount(3);

    const entry = service.get('builtin:websocket-clients');
    expect(entry?.reading?.data).toEqual({ clientCount: 3 });
  });

  it('notifyWebSocketClientCount clamps negative values to 0', () => {
    service.startBuiltinSensors();
    service.notifyWebSocketClientCount(-5);

    const entry = service.get('builtin:websocket-clients');
    expect(entry?.reading?.data).toEqual({ clientCount: 0 });
  });

  it('stopBuiltinSensors cleans up the electron idle interval', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    service.startBuiltinSensors();
    service.stopBuiltinSensors();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
