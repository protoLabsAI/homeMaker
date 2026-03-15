/**
 * Unit tests for health-score-calculator utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { calculateHomeHealthScore } from '../src/utils/health-score-calculator.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      nextDueAt TEXT NOT NULL,
      intervalDays INTEGER NOT NULL DEFAULT 30,
      lastCompletedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_completions (
      id TEXT PRIMARY KEY,
      scheduleId TEXT NOT NULL REFERENCES maintenance(id),
      completedAt TEXT NOT NULL,
      completedBy TEXT NOT NULL DEFAULT 'test',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchaseDate TEXT,
      warrantyExpiration TEXT,
      photoUrls TEXT DEFAULT '[]',
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

    CREATE TABLE IF NOT EXISTS vault_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      encryptedValue TEXT NOT NULL,
      iv TEXT NOT NULL,
      tag TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gamification_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streaks TEXT NOT NULL DEFAULT '{"maintenance":{"current":0,"best":0,"lastCompletedAt":null},"budget":{"current":0,"best":0,"lastMonth":null}}',
      homeHealthScore TEXT NOT NULL DEFAULT '{}',
      updatedAt TEXT NOT NULL
    );
  `);

  // Insert required gamification profile row
  db.prepare(
    `INSERT INTO gamification_profile (id, xp, level, streaks, homeHealthScore, updatedAt)
     VALUES (1, 0, 1, ?, '{}', ?)`
  ).run(
    JSON.stringify({
      maintenance: { current: 0, best: 0, lastCompletedAt: null },
      budget: { current: 0, best: 0, lastMonth: null },
    }),
    new Date().toISOString()
  );

  return db;
}

describe('calculateHomeHealthScore', () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('returns a score with all 4 pillars and pillarHints', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score).toHaveProperty('total');
    expect(score).toHaveProperty('maintenance');
    expect(score).toHaveProperty('inventory');
    expect(score).toHaveProperty('budget');
    expect(score).toHaveProperty('systems');
    expect(score).toHaveProperty('calculatedAt');
    expect(score).toHaveProperty('pillarHints');
    expect(Array.isArray(score.pillarHints)).toBe(true);
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

  it('maintenance score is 0 with no schedules', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.maintenance).toBe(0);
    expect(score.pillarHints).toContain(
      'Add maintenance schedules to improve your Maintenance score'
    );
  });

  it('maintenance score is 0 with no completions (0% on-time rate)', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO maintenance (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms1', 'Test', ?, 30, ?, ?)`
    ).run(future, now, now);

    const score = calculateHomeHealthScore({ db });
    // 1 schedule, 0 completions in last 6 months → 0% on-time → 0 pts
    // No overdue (nextDueAt is future) → 0 penalty
    // No streak → 0 bonus
    expect(score.maintenance).toBe(0);
  });

  it('maintenance score improves with completions in the last 6 months', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO maintenance (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms1', 'Test', ?, 30, ?, ?)`
    ).run(future, now, now);
    db.prepare(
      `INSERT INTO maintenance_completions (id, scheduleId, completedAt, completedBy)
       VALUES ('c1', 'ms1', ?, 'user')`
    ).run(now);

    const score = calculateHomeHealthScore({ db });
    // 1 of 1 completed in last 6 months → 100% → 15 pts, no overdue penalty → score = 15
    expect(score.maintenance).toBe(15);
  });

  it('maintenance score is lower with overdue schedules', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO maintenance (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms1', 'Overdue', ?, 30, ?, ?)`
    ).run(past, now, now);
    db.prepare(
      `INSERT INTO maintenance (id, title, nextDueAt, intervalDays, createdAt, updatedAt)
       VALUES ('ms2', 'Current', ?, 30, ?, ?)`
    ).run(future, now, now);
    // Complete both schedules in last 6 months
    db.prepare(
      `INSERT INTO maintenance_completions (id, scheduleId, completedAt, completedBy)
       VALUES ('c1', 'ms1', ?, 'user')`
    ).run(now);
    db.prepare(
      `INSERT INTO maintenance_completions (id, scheduleId, completedAt, completedBy)
       VALUES ('c2', 'ms2', ?, 'user')`
    ).run(now);

    const score = calculateHomeHealthScore({ db });
    // 100% completion → 15 pts, 1 overdue → -2 pts → 13 pts
    expect(score.maintenance).toBe(13);
    expect(score.maintenance).toBeGreaterThanOrEqual(0);
  });

  it('inventory score is 0 with no assets', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.inventory).toBe(0);
  });

  it('inventory score is at least 3 with 1 asset', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO assets (id, name, category, createdAt, updatedAt) VALUES ('a1', 'Fridge', 'appliance', ?, ?)`
    ).run(now, now);

    const score = calculateHomeHealthScore({ db });
    // 1 asset = 3 pts for count, 0 photos, 0 warranty dates → 3 pts
    expect(score.inventory).toBeGreaterThanOrEqual(3);
  });

  it('inventory score increases with photo and warranty documentation', () => {
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO assets (id, name, category, photoUrls, warrantyExpiration, purchaseDate, createdAt, updatedAt)
       VALUES ('a1', 'Fridge', 'appliance', '["photo.jpg"]', ?, ?, ?, ?)`
    ).run(futureDate, now, now, now);

    const score = calculateHomeHealthScore({ db });
    // 1 asset (3 pts) + photos (5 pts) + warrantyDates (5 pts) + warrantyTracking (5 pts) = 18
    expect(score.inventory).toBeGreaterThanOrEqual(15);
  });

  it('budget score is 0 with no categories', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.budget).toBe(0);
  });

  it('budget score is 0 with categories but zero budgetedAmount', () => {
    db.prepare(
      "INSERT INTO budget_categories (id, name, budgetedAmount) VALUES ('cat1', 'Groceries', 0)"
    ).run();

    const score = calculateHomeHealthScore({ db });
    // Total budget = 0 → no comparison possible → 0
    expect(score.budget).toBe(0);
  });

  it('budget score reaches 17 with categories, budget, and no overspend', () => {
    db.prepare(
      "INSERT INTO budget_categories (id, name, budgetedAmount) VALUES ('cat1', 'Groceries', 50000)"
    ).run();

    const score = calculateHomeHealthScore({ db });
    // Has budget, no spending this month → ratio = 0 → under budget (10 pts)
    // Trend: no prior data → steady (7 pts)
    // Streak = 0 → 0 pts
    // Total: 10 + 7 + 0 = 17
    expect(score.budget).toBe(17);
  });

  it('systems score is 0 with no sensors and no vault', () => {
    const score = calculateHomeHealthScore({ db });
    expect(score.systems).toBe(0);
  });

  it('systems score is 5 with vault entries', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vault_entries (id, name, encryptedValue, iv, tag, createdAt, updatedAt)
       VALUES ('v1', 'WiFi Password', 'enc', 'iv', 'tag', ?, ?)`
    ).run(now, now);

    const score = calculateHomeHealthScore({ db });
    // No sensors (0 pts) + vault (5 pts) = 5
    expect(score.systems).toBe(5);
  });

  it('systems score improves with active sensors via sensorRegistry', () => {
    const mockRegistry = {
      getAll: () => [
        { sensor: { id: 's1' }, state: 'active' as const },
        { sensor: { id: 's2' }, state: 'active' as const },
        { sensor: { id: 's3' }, state: 'stale' as const },
      ],
    };

    const score = calculateHomeHealthScore({ db, sensorRegistry: mockRegistry });
    // 3 sensors: 2/3 active → round(15 * 0.67) = 10 pts
    // sensor count 1-3 → 2 pts
    // vault = 0 pts
    // total systems = 12
    expect(score.systems).toBeGreaterThan(0);
    expect(score.systems).toBeLessThanOrEqual(25);
  });

  it('pillarHints includes hints from lowest-scoring pillars', () => {
    const score = calculateHomeHealthScore({ db });
    // Empty state should have hints about all empty pillars
    expect(score.pillarHints.length).toBeGreaterThan(0);
    expect(score.pillarHints.length).toBeLessThanOrEqual(3);
  });
});
