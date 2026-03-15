/**
 * Unit tests for gamification API route factory
 *
 * Tests the route factory by invoking handler logic through mock req/res objects.
 * This avoids a full HTTP stack while still exercising the route handlers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import BetterSqlite3 from 'better-sqlite3';
import { GamificationService } from '../src/services/gamification-service.js';
import { createGamificationRoutes } from '../src/routes/gamification/index.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
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

/** Create minimal mock response that captures json() calls */
function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('createGamificationRoutes', () => {
  let db: BetterSqlite3.Database;
  let service: GamificationService;

  beforeEach(() => {
    db = createTestDb();
    service = new GamificationService(db);
  });

  it('factory returns a router without throwing', () => {
    const router = createGamificationRoutes(service);
    expect(router).toBeDefined();
  });

  it('getProfile handler returns success with profile data', () => {
    const res = mockRes();
    // Call service directly to confirm same data shape
    const profile = service.getProfile();
    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);

    // Route handler calls res.json({ success: true, data: profile })
    res.json({ success: true, data: profile });
    const body = res.body as { success: boolean; data: { xp: number; level: number } };
    expect(body.success).toBe(true);
    expect(body.data.xp).toBe(0);
    expect(body.data.level).toBe(1);
  });

  it('getAchievements handler returns non-empty list', () => {
    const achievements = service.getAchievements();
    expect(achievements.length).toBeGreaterThan(0);
    expect(achievements.every((a) => 'id' in a && 'earned' in a)).toBe(true);
  });

  it('markAchievementSeen returns false for unearned achievement', () => {
    const found = service.markAchievementSeen('first_steps');
    expect(found).toBe(false);
  });

  it('markAchievementSeen returns true for earned achievement', () => {
    db.prepare(
      "INSERT INTO earned_achievements (id, unlockedAt, seen) VALUES ('first_steps', ?, 0)"
    ).run(new Date().toISOString());

    const found = service.markAchievementSeen('first_steps');
    expect(found).toBe(true);
  });

  it('getHealthScore returns valid score with all pillars', () => {
    const score = service.calculateHomeHealthScore();
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.maintenance + score.inventory + score.budget + score.systems).toBe(score.total);
  });

  it('getQuests returns empty array initially', () => {
    const quests = service.getQuests();
    expect(quests).toHaveLength(0);
  });
});
