/**
 * Unit tests for GamificationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { GamificationService } from '../src/services/gamification-service.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables needed by GamificationService and health score calculator
  db.exec(`
    CREATE TABLE IF NOT EXISTS gamification_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streaks TEXT NOT NULL DEFAULT '{}',
      homeHealthScore TEXT NOT NULL DEFAULT '{}',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS earned_achievements (
      id TEXT PRIMARY KEY,
      unlockedAt TEXT NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS xp_history (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      amount INTEGER NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1.0,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_quests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      xpReward INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      target INTEGER NOT NULL,
      category TEXT NOT NULL,
      expiresAt TEXT,
      generatedBy TEXT NOT NULL DEFAULT 'system',
      createdAt TEXT NOT NULL
    );

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
  `);

  return db;
}

describe('GamificationService', () => {
  let db: BetterSqlite3.Database;
  let service: GamificationService;

  beforeEach(() => {
    db = createTestDb();
    service = new GamificationService(db);
  });

  // ── getProfile ─────────────────────────────────────────────────────────

  it('returns default profile on fresh database', () => {
    const profile = service.getProfile();
    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);
    expect(profile.levelTitle).toBe('Homeowner');
    expect(profile.xpToNextLevel).toBe(500);
    expect(profile.achievements).toHaveLength(0);
    expect(profile.streaks.maintenance.current).toBe(0);
    expect(profile.streaks.budget.current).toBe(0);
  });

  // ── awardXp ────────────────────────────────────────────────────────────

  it('accumulates XP correctly', () => {
    service.awardXp('test', 100);
    service.awardXp('test', 50);
    const profile = service.getProfile();
    expect(profile.xp).toBe(150);
  });

  it('applies multiplier and rounds down', () => {
    const result = service.awardXp('test', 30, 1.5);
    // 30 * 1.5 = 45.0 → floor = 45
    expect(result.xpGained).toBe(45);
    expect(result.newTotal).toBe(45);
  });

  it('floors fractional XP from multiplier', () => {
    // 10 * 1.3 = 13.0 → floor = 13
    const result = service.awardXp('test', 10, 1.3);
    expect(result.xpGained).toBe(13);
  });

  it('triggers level-up at threshold 500', () => {
    const result = service.awardXp('test', 500);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.newTitle).toBe('Handyman');
  });

  it('does not level-up below threshold', () => {
    const result = service.awardXp('test', 499);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });

  it('levels up through multiple thresholds', () => {
    service.awardXp('test', 7000);
    const profile = service.getProfile();
    expect(profile.level).toBe(5);
    expect(profile.levelTitle).toBe('Home Pro');
  });

  it('awards 0 XP when multiplier is 0', () => {
    const result = service.awardXp('test', 100, 0);
    expect(result.xpGained).toBe(0);
    expect(result.newTotal).toBe(0);
    expect(result.leveledUp).toBe(false);
  });

  it('records XP in xp_history', () => {
    service.awardXp('maintenance_on_time', 50);
    const row = db
      .prepare("SELECT * FROM xp_history WHERE source = 'maintenance_on_time'")
      .get() as { source: string; amount: number };
    expect(row).toBeDefined();
    expect(row.amount).toBe(50);
  });

  // ── updateStreaks ──────────────────────────────────────────────────────

  it('increments maintenance streak on completion', () => {
    service.updateStreaks('maintenance', true);
    service.updateStreaks('maintenance', true);
    const profile = service.getProfile();
    expect(profile.streaks.maintenance.current).toBe(2);
    expect(profile.streaks.maintenance.best).toBe(2);
  });

  it('resets maintenance streak on failure', () => {
    service.updateStreaks('maintenance', true);
    service.updateStreaks('maintenance', true);
    service.updateStreaks('maintenance', false);
    const profile = service.getProfile();
    expect(profile.streaks.maintenance.current).toBe(0);
    expect(profile.streaks.maintenance.best).toBe(2); // best preserved
  });

  it('increments budget streak on completion', () => {
    service.updateStreaks('budget', true);
    const profile = service.getProfile();
    expect(profile.streaks.budget.current).toBe(1);
  });

  // ── getAchievements ────────────────────────────────────────────────────

  it('returns full catalog with earned=false initially', () => {
    const achievements = service.getAchievements();
    expect(achievements.length).toBeGreaterThan(0);
    expect(achievements.every((a) => !a.earned)).toBe(true);
  });

  // ── markAchievementSeen ────────────────────────────────────────────────

  it('returns false when achievement is not earned', () => {
    const result = service.markAchievementSeen('first_steps');
    expect(result).toBe(false);
  });

  it('marks earned achievement as seen', () => {
    // Manually insert an earned achievement
    db.prepare(
      "INSERT INTO earned_achievements (id, unlockedAt, seen) VALUES ('first_steps', ?, 0)"
    ).run(new Date().toISOString());

    const result = service.markAchievementSeen('first_steps');
    expect(result).toBe(true);

    const profile = service.getProfile();
    const ach = profile.achievements.find((a) => a.id === 'first_steps');
    expect(ach?.seen).toBe(true);
  });

  // ── getQuests ──────────────────────────────────────────────────────────

  it('returns empty quest list initially', () => {
    const quests = service.getQuests();
    expect(quests).toHaveLength(0);
  });

  it('returns active quests', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    db.prepare(
      `INSERT INTO active_quests (id, title, description, xpReward, progress, target, category, expiresAt, generatedBy, createdAt)
       VALUES ('q1', 'Test Quest', 'Do something', 100, 0, 5, 'maintenance', ?, 'system', ?)`
    ).run(future, new Date().toISOString());

    const quests = service.getQuests();
    expect(quests).toHaveLength(1);
    expect(quests[0]?.id).toBe('q1');
  });

  it('filters out expired quests', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    db.prepare(
      `INSERT INTO active_quests (id, title, description, xpReward, progress, target, category, expiresAt, generatedBy, createdAt)
       VALUES ('q-expired', 'Expired', 'Old quest', 50, 0, 1, 'maintenance', ?, 'system', ?)`
    ).run(past, new Date().toISOString());

    const quests = service.getQuests();
    expect(quests).toHaveLength(0);
  });

  // ── calculateHomeHealthScore ───────────────────────────────────────────

  it('returns a 0-100 score', () => {
    const score = service.calculateHomeHealthScore();
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.calculatedAt).toBeTruthy();
  });

  it('persists health score after calculation', () => {
    service.calculateHomeHealthScore();
    const profile = service.getProfile();
    expect(profile.homeHealthScore.calculatedAt).toBeTruthy();
  });
});
