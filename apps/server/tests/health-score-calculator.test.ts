/**
 * Unit tests for health-score-calculator utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { calculateHomeHealthScore } from '../src/utils/health-score-calculator.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      nextDueAt TEXT NOT NULL,
      intervalDays INTEGER NOT NULL DEFAULT 30,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      manualUrl TEXT,
      warrantyExpiration TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      budgetedAmount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      sensorId TEXT NOT NULL,
      data TEXT NOT NULL,
      receivedAt TEXT NOT NULL,
      PRIMARY KEY (sensorId, receivedAt)
    );
  `);
  return db;
}

describe('calculateHomeHealthScore', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('returns a score with all 4 pillars', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score).toHaveProperty('total');
    expect(score).toHaveProperty('maintenance');
    expect(score).toHaveProperty('inventory');
    expect(score).toHaveProperty('budget');
    expect(score).toHaveProperty('systems');
    expect(score).toHaveProperty('calculatedAt');
  });

  it('total equals sum of pillars', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.total).toBe(score.maintenance + score.inventory + score.budget + score.systems);
  });

  it('all pillars are within 0-25 range', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.maintenance).toBeGreaterThanOrEqual(0);
    expect(score.maintenance).toBeLessThanOrEqual(25);
    expect(score.inventory).toBeGreaterThanOrEqual(0);
    expect(score.inventory).toBeLessThanOrEqual(25);
    expect(score.budget).toBeGreaterThanOrEqual(0);
    expect(score.budget).toBeLessThanOrEqual(25);
    expect(score.systems).toBeGreaterThanOrEqual(0);
    expect(score.systems).toBeLessThanOrEqual(25);
  });

  it('maintenance score is 15 with no schedules (neutral)', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.maintenance).toBe(15);
  });

  it('maintenance score is 25 with all schedules current', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO maintenance_schedules (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms1', 'Test', ?, 30, ?, ?)`
    ).run(future, now, now);

    const score = calculateHomeHealthScore({ db });
    expect(score.maintenance).toBe(25);
  });

  it('maintenance score is lower with overdue schedules', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO maintenance_schedules (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms1', 'Overdue', ?, 30, ?, ?)`
    ).run(past, now, now);
    db.prepare(
      `INSERT INTO maintenance_schedules (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms2', 'Current', ?, 30, ?, ?)`
    ).run(future, now, now);

    const score = calculateHomeHealthScore({ db });
    // 1 of 2 overdue = 50% ratio → 25 * 0.5 = 12.5 → round = 12 or 13
    expect(score.maintenance).toBeLessThan(25);
    expect(score.maintenance).toBeGreaterThanOrEqual(0);
  });

  it('inventory score is 0 with no assets', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.inventory).toBe(0);
  });

  it('inventory score is at least 15 with 1 asset', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO assets (id, name, category, createdAt, updatedAt) VALUES ('a1', 'Fridge', 'appliance', ?, ?)`
    ).run(now, now);

    const score = calculateHomeHealthScore({ db });
    expect(score.inventory).toBeGreaterThanOrEqual(15);
  });

  it('budget score is 0 with no categories', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.budget).toBe(0);
  });

  it('budget score improves when categories exist but no transactions', () => {
    db.prepare(
      "INSERT INTO budget_categories (id, name, budgetedAmount) VALUES ('cat1', 'Groceries', 500)"
    ).run();

    const score = calculateHomeHealthScore({ db });
    // Has categories but no transactions → 10 pts
    expect(score.budget).toBe(10);
  });

  it('systems score is 5 with no sensors', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.systems).toBe(5);
  });

  it('systems score increases with more sensors', () => {
    const now = new Date().toISOString();
    // Insert readings for 3 different sensors
    db.prepare(
      "INSERT INTO sensor_readings (sensorId, data, receivedAt) VALUES ('s1', '{}', ?)"
    ).run(now);
    db.prepare(
      "INSERT INTO sensor_readings (sensorId, data, receivedAt) VALUES ('s2', '{}', ?)"
    ).run(now);
    db.prepare(
      "INSERT INTO sensor_readings (sensorId, data, receivedAt) VALUES ('s3', '{}', ?)"
    ).run(now);

    const score = calculateHomeHealthScore({ db });
    expect(score.systems).toBe(18); // 3-5 sensors = 18
  });
});
