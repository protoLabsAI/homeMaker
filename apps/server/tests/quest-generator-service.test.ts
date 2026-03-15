/**
 * Unit tests for QuestGeneratorService and quest lifecycle methods on GamificationService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { GamificationService } from '../src/services/gamification-service.js';
import { QuestGeneratorService } from '../src/services/quest-generator-service.js';
import type { Quest, QuestCategory } from '@protolabsai/types';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
      status TEXT NOT NULL DEFAULT 'active',
      expiresAt TEXT,
      completedAt TEXT,
      generatedBy TEXT NOT NULL DEFAULT 'system',
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_active_quests_status ON active_quests(status);
    CREATE INDEX IF NOT EXISTS idx_active_quests_category ON active_quests(category);

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      purchaseDate TEXT,
      purchasePrice INTEGER,
      warrantyExpiration TEXT,
      modelNumber TEXT,
      serialNumber TEXT,
      manufacturer TEXT,
      manualUrl TEXT,
      replacementCost INTEGER,
      notes TEXT,
      sensorIds TEXT DEFAULT '[]',
      photoUrls TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      category TEXT,
      notes TEXT,
      rating INTEGER,
      lastContactedAt TEXT,
      lastServiceDate TEXT,
      linkedAssetIds TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      intervalDays INTEGER NOT NULL,
      lastCompletedAt TEXT,
      nextDueAt TEXT NOT NULL,
      assetId TEXT,
      category TEXT NOT NULL,
      estimatedCostUsd REAL,
      vendorId TEXT,
      completedById TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_completions (
      id TEXT PRIMARY KEY,
      scheduleId TEXT NOT NULL REFERENCES maintenance(id),
      completedAt TEXT NOT NULL,
      completedBy TEXT NOT NULL,
      notes TEXT,
      actualCostUsd REAL
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      budgetedAmount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      categoryId TEXT REFERENCES budget_categories(id),
      description TEXT,
      date TEXT NOT NULL,
      recurrence TEXT,
      createdAt TEXT NOT NULL
    );
  `);

  return db;
}

function createMockEvents() {
  return {
    emit: vi.fn(),
    subscribe: vi.fn(() => {
      const unsub = vi.fn() as ReturnType<typeof vi.fn> & { unsubscribe: () => void };
      unsub.unsubscribe = vi.fn();
      return unsub;
    }),
    on: vi.fn(() => {
      const unsub = vi.fn() as ReturnType<typeof vi.fn> & { unsubscribe: () => void };
      unsub.unsubscribe = vi.fn();
      return unsub;
    }),
    broadcast: vi.fn(),
    setRemoteBroadcaster: vi.fn(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function insertOverdueMaintenance(
  db: BetterSqlite3.Database,
  count: number,
  daysOverdue = 5
): void {
  const pastDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    db.prepare(
      `INSERT INTO maintenance (id, title, description, intervalDays, nextDueAt, category, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(`maint-${i}`, `Task ${i}`, `Desc ${i}`, 30, pastDate, 'hvac', now, now);
  }
}

function insertAssetWithoutPhoto(db: BetterSqlite3.Database, count: number): void {
  const now = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    db.prepare(
      `INSERT INTO assets (id, name, category, photoUrls, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(`asset-nophoto-${i}`, `Asset ${i}`, 'appliance', '[]', now, now);
  }
}

function insertBudgetCategory(db: BetterSqlite3.Database): void {
  db.prepare(`INSERT INTO budget_categories (id, name) VALUES (?, ?)`).run('cat-1', 'Groceries');
}

function insertActiveQuest(
  db: BetterSqlite3.Database,
  overrides: Partial<{
    id: string;
    title: string;
    category: string;
    progress: number;
    target: number;
    xpReward: number;
    status: string;
    expiresAt: string;
    completedAt: string;
  }> = {}
): void {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO active_quests (id, title, description, xpReward, progress, target, category, status, expiresAt, completedAt, generatedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    overrides.id ?? `quest-${Date.now()}`,
    overrides.title ?? 'Test Quest',
    'Test description',
    overrides.xpReward ?? 50,
    overrides.progress ?? 0,
    overrides.target ?? 1,
    overrides.category ?? 'maintenance',
    overrides.status ?? 'active',
    overrides.expiresAt ?? future,
    overrides.completedAt ?? null,
    'system',
    now
  );
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('QuestGeneratorService', () => {
  let db: BetterSqlite3.Database;
  let gamificationService: GamificationService;
  let questGeneratorService: QuestGeneratorService;
  let events: ReturnType<typeof createMockEvents>;

  beforeEach(() => {
    db = createTestDb();
    events = createMockEvents();
    gamificationService = new GamificationService(db, events as never);
    questGeneratorService = new QuestGeneratorService(db, gamificationService);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('generateQuests', () => {
    it('generates only seasonal quest when no other conditions are met', () => {
      const result = questGeneratorService.generateQuests();
      // Seasonal quests always generate (every month maps to a season).
      // No maintenance, inventory, budget, or sensor conditions are met,
      // so only the seasonal quest should appear.
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('seasonal');
    });

    it('generates a maintenance quest when tasks are overdue', () => {
      insertOverdueMaintenance(db, 3);
      const result = questGeneratorService.generateQuests();

      const maintenanceQuest = result.find((q) => q.category === 'maintenance');
      expect(maintenanceQuest).toBeDefined();
      expect(maintenanceQuest!.title).toBe('Clear the Backlog');
      expect(maintenanceQuest!.target).toBe(3);
      expect(maintenanceQuest!.xpReward).toBe(75); // 3 * 25
      expect(maintenanceQuest!.status).toBe('active');
    });

    it('generates an urgent maintenance quest when a task is 31+ days overdue', () => {
      insertOverdueMaintenance(db, 1, 35);
      const result = questGeneratorService.generateQuests();

      const maintenanceQuest = result.find((q) => q.category === 'maintenance');
      expect(maintenanceQuest).toBeDefined();
      expect(maintenanceQuest!.title).toContain('Urgent:');
      expect(maintenanceQuest!.xpReward).toBe(75);
      expect(maintenanceQuest!.target).toBe(1);
    });

    it('generates an inventory quest for assets without photos', () => {
      insertAssetWithoutPhoto(db, 10);
      const result = questGeneratorService.generateQuests();

      const inventoryQuest = result.find((q) => q.category === 'inventory');
      expect(inventoryQuest).toBeDefined();
      expect(inventoryQuest!.title).toBe('Photo Safari');
      expect(inventoryQuest!.target).toBe(5); // min(5, 10)
      expect(inventoryQuest!.xpReward).toBe(100);
    });

    it('generates a budget quest when no recent transactions exist', () => {
      insertBudgetCategory(db);
      const result = questGeneratorService.generateQuests();

      const budgetQuest = result.find((q) => q.category === 'budget');
      expect(budgetQuest).toBeDefined();
      expect(budgetQuest!.title).toBe('Stay Current');
    });

    it('generates multiple quests up to 3 when multiple conditions are met', () => {
      insertOverdueMaintenance(db, 2);
      insertAssetWithoutPhoto(db, 3);
      insertBudgetCategory(db);

      const result = questGeneratorService.generateQuests();
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(3);

      const categories = result.map((q) => q.category);
      expect(categories).toContain('maintenance');
      expect(categories).toContain('inventory');
    });

    it('respects the 3 active quest maximum', () => {
      insertActiveQuest(db, { id: 'q-0', category: 'maintenance' });
      insertActiveQuest(db, { id: 'q-1', category: 'inventory' });
      insertActiveQuest(db, { id: 'q-2', category: 'budget' });

      insertOverdueMaintenance(db, 5);
      const result = questGeneratorService.generateQuests();
      expect(result).toHaveLength(0);
    });

    it('never generates duplicate category quests', () => {
      insertActiveQuest(db, { id: 'existing-maint', category: 'maintenance' });
      insertOverdueMaintenance(db, 3);
      insertAssetWithoutPhoto(db, 5);

      const result = questGeneratorService.generateQuests();

      // Should NOT generate a second maintenance quest
      const maintenanceQuests = result.filter((q) => q.category === 'maintenance');
      expect(maintenanceQuests).toHaveLength(0);
    });

    it('generates seasonal quests based on current month', () => {
      const result = questGeneratorService.generateQuests();
      const seasonal = result.find((q) => q.category === 'seasonal');
      // Seasonal quest should always be generated since every month maps to a season
      expect(seasonal).toBeDefined();
      expect(seasonal!.target).toBe(3);
      expect(seasonal!.xpReward).toBe(100);
    });
  });

  describe('sensor quests', () => {
    it('generates a sensor quest when offline sensors exist', () => {
      const mockSensorRegistry = {
        getAll: () => [
          { sensor: { id: 's1' }, state: 'active' as const },
          { sensor: { id: 's2' }, state: 'offline' as const },
          { sensor: { id: 's3' }, state: 'offline' as const },
        ],
      };

      const svc = new QuestGeneratorService(db, gamificationService, mockSensorRegistry);
      const result = svc.generateQuests();

      const sensorQuest = result.find((q) => q.category === 'sensor');
      expect(sensorQuest).toBeDefined();
      expect(sensorQuest!.title).toBe('Reconnect');
      expect(sensorQuest!.target).toBe(2);
      expect(sensorQuest!.xpReward).toBe(50);
    });

    it('skips sensor quest when all sensors are online', () => {
      const mockSensorRegistry = {
        getAll: () => [
          { sensor: { id: 's1' }, state: 'active' as const },
          { sensor: { id: 's2' }, state: 'active' as const },
        ],
      };

      const svc = new QuestGeneratorService(db, gamificationService, mockSensorRegistry);
      const result = svc.generateQuests();

      const sensorQuest = result.find((q) => q.category === 'sensor');
      expect(sensorQuest).toBeUndefined();
    });
  });

  describe('quest lifecycle via GamificationService', () => {
    it('incrementQuestProgress advances progress and completes quest at target', () => {
      insertActiveQuest(db, {
        id: 'quest-inc',
        category: 'maintenance',
        progress: 0,
        target: 2,
        xpReward: 50,
      });

      gamificationService.incrementQuestProgress('maintenance');
      const afterOne = gamificationService.getQuests();
      expect(afterOne).toHaveLength(1);
      expect(afterOne[0].progress).toBe(1);

      // Second increment should complete the quest
      gamificationService.incrementQuestProgress('maintenance');
      const afterTwo = gamificationService.getQuests();
      // Completed quests have status='completed' and are not returned by getQuests
      expect(afterTwo).toHaveLength(0);

      // Verify XP was awarded
      expect(events.emit).toHaveBeenCalledWith(
        'gamification:quest-completed',
        expect.objectContaining({
          questId: 'quest-inc',
          xpReward: 50,
        })
      );
    });

    it('completeQuestById awards XP and marks quest completed', () => {
      insertActiveQuest(db, {
        id: 'quest-manual',
        category: 'inventory',
        progress: 1,
        target: 3,
        xpReward: 75,
      });

      const result = gamificationService.completeQuestById('quest-manual');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.completedAt).toBeDefined();

      // Verify XP was awarded
      expect(events.emit).toHaveBeenCalledWith(
        'gamification:xp-gained',
        expect.objectContaining({ amount: 75 })
      );
    });

    it('completeQuestById returns null for non-existent quest', () => {
      const result = gamificationService.completeQuestById('nonexistent');
      expect(result).toBeNull();
    });

    it('completeQuestById returns null for already-completed quest', () => {
      insertActiveQuest(db, {
        id: 'quest-done',
        category: 'budget',
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const result = gamificationService.completeQuestById('quest-done');
      expect(result).toBeNull();
    });

    it('getQuests removes expired quests and emits events', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      insertActiveQuest(db, {
        id: 'quest-expired',
        category: 'seasonal',
        expiresAt: past,
      });

      const quests = gamificationService.getQuests();
      expect(quests).toHaveLength(0);

      expect(events.emit).toHaveBeenCalledWith(
        'gamification:quest-expired',
        expect.objectContaining({ questId: 'quest-expired' })
      );
    });

    it('insertQuest respects max active quest limit', () => {
      insertActiveQuest(db, { id: 'q-0', category: 'maintenance' });
      insertActiveQuest(db, { id: 'q-1', category: 'inventory' });
      insertActiveQuest(db, { id: 'q-2', category: 'budget' });

      const now = new Date().toISOString();
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newQuest: Quest = {
        id: 'q-4',
        title: 'Fourth Quest',
        description: 'Should be rejected',
        xpReward: 25,
        progress: 0,
        target: 1,
        category: 'sensor',
        status: 'active',
        createdAt: now,
        expiresAt: future,
        generatedBy: 'system',
      };

      const result = gamificationService.insertQuest(newQuest);
      expect(result).toBeNull();
    });

    it('insertQuest rejects duplicate category', () => {
      insertActiveQuest(db, { id: 'q-existing', category: 'maintenance' });

      const now = new Date().toISOString();
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const newQuest: Quest = {
        id: 'q-dupe',
        title: 'Duplicate',
        description: 'Should be rejected',
        xpReward: 25,
        progress: 0,
        target: 1,
        category: 'maintenance',
        status: 'active',
        createdAt: now,
        expiresAt: future,
        generatedBy: 'system',
      };

      const result = gamificationService.insertQuest(newQuest);
      expect(result).toBeNull();
    });

    it('clamps negative progress to 0', () => {
      insertActiveQuest(db, {
        id: 'q-neg',
        category: 'budget',
        progress: -5,
        target: 3,
      });

      const quests = gamificationService.getQuests();
      expect(quests[0].progress).toBe(0);
    });
  });

  describe('inventory quest variants', () => {
    it('generates Warranty Hunt when assets lack warranty info', () => {
      const now = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        db.prepare(
          `INSERT INTO assets (id, name, category, photoUrls, warrantyExpiration, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(`asset-w-${i}`, `Asset ${i}`, 'appliance', '["photo.jpg"]', null, now, now);
      }

      const result = questGeneratorService.generateQuests();
      const inventoryQuest = result.find((q) => q.category === 'inventory');
      expect(inventoryQuest).toBeDefined();
      expect(inventoryQuest!.title).toBe('Warranty Hunt');
      expect(inventoryQuest!.target).toBe(3); // min(3, 5)
    });

    it('generates Home Census when total assets < 20 with photos and warranties', () => {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      for (let i = 0; i < 10; i++) {
        db.prepare(
          `INSERT INTO assets (id, name, category, photoUrls, warrantyExpiration, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(`asset-c-${i}`, `Asset ${i}`, 'appliance', '["photo.jpg"]', future, now, now);
      }

      const result = questGeneratorService.generateQuests();
      const inventoryQuest = result.find((q) => q.category === 'inventory');
      expect(inventoryQuest).toBeDefined();
      expect(inventoryQuest!.title).toBe('Home Census');
      expect(inventoryQuest!.target).toBe(5); // min(5, 20-10)
    });
  });
});
