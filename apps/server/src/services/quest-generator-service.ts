/**
 * QuestGeneratorService — generates contextual, personalized quests based on
 * home state data. Quests are short-term goals that reward XP on completion.
 *
 * Quest categories:
 *   - maintenance: overdue/backlog maintenance tasks
 *   - inventory:   missing photos, warranties, or low asset counts
 *   - budget:      overspending recovery, transaction logging
 *   - seasonal:    month-based home care reminders
 *   - sensor:      offline sensor reconnection
 *
 * Generation rules:
 *   - Maximum 3 active quests at any time
 *   - Never 2 active quests of the same category
 *   - Expired quests are silently removed before generation
 *   - Progress is tracked via event listeners in xp-event-listeners.ts
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type { Quest, QuestCategory } from '@protolabsai/types';
import type { GamificationService } from './gamification-service.js';

const logger = createLogger('QuestGeneratorService');

/** Maximum active quests — mirrors the limit in GamificationService */
const MAX_ACTIVE_QUESTS = 3;

/** Default quest expiry: 7 days from generation */
const DEFAULT_EXPIRY_DAYS = 7;

/** Seasonal quest expiry: 30 days from generation */
const SEASONAL_EXPIRY_DAYS = 30;

// ── Season Definitions (fixed boundaries per deviation rules) ─────────────

interface SeasonDefinition {
  name: string;
  months: number[];
  title: string;
  description: string;
  xpReward: number;
  target: number;
}

const SEASONS: SeasonDefinition[] = [
  {
    name: 'winter',
    months: [12, 1, 2],
    title: 'Winter Armor',
    description: 'Check furnace filter, test smoke detectors, inspect weather stripping',
    xpReward: 100,
    target: 3,
  },
  {
    name: 'spring',
    months: [3, 4, 5],
    title: 'Spring Revival',
    description: 'Schedule HVAC service, check roof, clean gutters',
    xpReward: 100,
    target: 3,
  },
  {
    name: 'summer',
    months: [6, 7, 8],
    title: 'Summer Shield',
    description: 'Service AC, inspect deck, check irrigation',
    xpReward: 100,
    target: 3,
  },
  {
    name: 'fall',
    months: [9, 10, 11],
    title: 'Fall Fortress',
    description: 'Clean gutters, check heating, test sump pump',
    xpReward: 100,
    target: 3,
  },
];

// ── Minimal service interfaces (avoid circular dependencies) ──────────────

interface SensorRegistryLike {
  getAll(): Array<{
    sensor: { id: string };
    state: 'active' | 'stale' | 'offline';
  }>;
}

// ── Quest Template Interface ──────────────────────────────────────────────

interface QuestTemplate {
  category: QuestCategory;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  expiryDays: number;
  generatedBy: 'system' | 'ava';
}

// ── Service ───────────────────────────────────────────────────────────────

export class QuestGeneratorService {
  private db: BetterSqlite3.Database;
  private gamificationService: GamificationService;
  private sensorRegistry?: SensorRegistryLike;

  constructor(
    db: BetterSqlite3.Database,
    gamificationService: GamificationService,
    sensorRegistry?: SensorRegistryLike
  ) {
    this.db = db;
    this.gamificationService = gamificationService;
    this.sensorRegistry = sensorRegistry;
  }

  /**
   * Generate quests based on current home state data.
   *
   * Evaluates all quest template generators, filters out categories that
   * already have active quests, and inserts up to the maximum allowed.
   *
   * Returns the list of newly generated quests.
   */
  generateQuests(): Quest[] {
    // Clean expired quests first (side effect of getQuests)
    this.gamificationService.getQuests();

    const activeCount = this.gamificationService.getActiveQuestCount();
    const slotsAvailable = MAX_ACTIVE_QUESTS - activeCount;

    if (slotsAvailable <= 0) {
      logger.info('No quest slots available (max 3 active)');
      return [];
    }

    const candidates = this.buildCandidates();
    const generated: Quest[] = [];

    for (const template of candidates) {
      if (generated.length >= slotsAvailable) break;

      // Atomic check: skip if a quest of this category was just inserted
      if (this.gamificationService.hasActiveQuestOfCategory(template.category)) {
        continue;
      }

      const quest = this.templateToQuest(template);
      const inserted = this.gamificationService.insertQuest(quest);
      if (inserted) {
        generated.push(inserted);
        logger.info(`Generated quest: "${inserted.title}" (${inserted.category})`);
      }
    }

    return generated;
  }

  /**
   * Build an ordered list of quest candidates from all template generators.
   * Priority order: maintenance > inventory > budget > sensor > seasonal
   */
  private buildCandidates(): QuestTemplate[] {
    const candidates: QuestTemplate[] = [];

    const maintenanceQuest = this.evaluateMaintenanceQuests();
    if (maintenanceQuest) candidates.push(maintenanceQuest);

    const inventoryQuest = this.evaluateInventoryQuests();
    if (inventoryQuest) candidates.push(inventoryQuest);

    const budgetQuest = this.evaluateBudgetQuests();
    if (budgetQuest) candidates.push(budgetQuest);

    const sensorQuest = this.evaluateSensorQuests();
    if (sensorQuest) candidates.push(sensorQuest);

    const seasonalQuest = this.evaluateSeasonalQuests();
    if (seasonalQuest) candidates.push(seasonalQuest);

    return candidates;
  }

  // ── Template Generators ─────────────────────────────────────────────────

  private evaluateMaintenanceQuests(): QuestTemplate | null {
    try {
      const now = new Date().toISOString();

      const overdueRow = this.db
        .prepare('SELECT COUNT(*) as count FROM maintenance WHERE nextDueAt < ?')
        .get(now) as { count: number } | undefined;

      const overdueCount = overdueRow?.count ?? 0;
      if (overdueCount <= 0) return null;

      // Check for severely overdue tasks (> 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const severelyOverdue = this.db
        .prepare(
          'SELECT title, nextDueAt FROM maintenance WHERE nextDueAt < ? ORDER BY nextDueAt ASC LIMIT 1'
        )
        .get(thirtyDaysAgo) as { title: string; nextDueAt: string } | undefined;

      if (severelyOverdue) {
        const daysOverdue = Math.floor(
          (Date.now() - new Date(severelyOverdue.nextDueAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          category: 'maintenance',
          title: `Urgent: ${severelyOverdue.title}`,
          description: `${severelyOverdue.title} is ${daysOverdue} days overdue -- complete it this week`,
          xpReward: 75,
          target: 1,
          expiryDays: DEFAULT_EXPIRY_DAYS,
          generatedBy: 'system',
        };
      }

      // Generic backlog quest
      return {
        category: 'maintenance',
        title: 'Clear the Backlog',
        description: `Complete ${overdueCount} overdue maintenance task${overdueCount > 1 ? 's' : ''}`,
        xpReward: overdueCount * 25,
        target: overdueCount,
        expiryDays: DEFAULT_EXPIRY_DAYS,
        generatedBy: 'system',
      };
    } catch (err) {
      logger.error('Failed to evaluate maintenance quests:', err);
      return null;
    }
  }

  private evaluateInventoryQuests(): QuestTemplate | null {
    try {
      // Count assets without photos
      const noPhotoRow = this.db
        .prepare(`SELECT COUNT(*) as count FROM assets WHERE photoUrls IS NULL OR photoUrls = '[]'`)
        .get() as { count: number } | undefined;

      const noPhotoCount = noPhotoRow?.count ?? 0;
      if (noPhotoCount > 0) {
        const target = Math.min(5, noPhotoCount);
        return {
          category: 'inventory',
          title: 'Photo Safari',
          description: `Add photos to ${target} asset${target > 1 ? 's' : ''}`,
          xpReward: 100,
          target,
          expiryDays: DEFAULT_EXPIRY_DAYS,
          generatedBy: 'system',
        };
      }

      // Count assets without warranty
      const noWarrantyRow = this.db
        .prepare(`SELECT COUNT(*) as count FROM assets WHERE warrantyExpiration IS NULL`)
        .get() as { count: number } | undefined;

      const noWarrantyCount = noWarrantyRow?.count ?? 0;
      if (noWarrantyCount > 0) {
        const target = Math.min(3, noWarrantyCount);
        return {
          category: 'inventory',
          title: 'Warranty Hunt',
          description: `Add warranty info to ${target} item${target > 1 ? 's' : ''}`,
          xpReward: 75,
          target,
          expiryDays: DEFAULT_EXPIRY_DAYS,
          generatedBy: 'system',
        };
      }

      // Low total assets (only suggest if user has started documenting at least 1 asset)
      const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM assets').get() as
        | { count: number }
        | undefined;

      const totalAssets = totalRow?.count ?? 0;
      if (totalAssets > 0 && totalAssets < 20) {
        const target = Math.min(5, 20 - totalAssets);
        return {
          category: 'inventory',
          title: 'Home Census',
          description: `Document ${target} more household item${target > 1 ? 's' : ''}`,
          xpReward: 50,
          target,
          expiryDays: DEFAULT_EXPIRY_DAYS,
          generatedBy: 'system',
        };
      }

      return null;
    } catch (err) {
      logger.error('Failed to evaluate inventory quests:', err);
      return null;
    }
  }

  private evaluateBudgetQuests(): QuestTemplate | null {
    try {
      // Check for transactions this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentTxRow = this.db
        .prepare('SELECT COUNT(*) as count FROM transactions WHERE date >= ?')
        .get(weekAgo) as { count: number } | undefined;

      const recentTxCount = recentTxRow?.count ?? 0;
      if (recentTxCount === 0) {
        // Check that we have at least some budget categories (user is engaged with budget)
        const categoryRow = this.db
          .prepare('SELECT COUNT(*) as count FROM budget_categories')
          .get() as { count: number } | undefined;

        if ((categoryRow?.count ?? 0) > 0) {
          return {
            category: 'budget',
            title: 'Stay Current',
            description: "Log this week's expenses",
            xpReward: 30,
            target: 3,
            expiryDays: DEFAULT_EXPIRY_DAYS,
            generatedBy: 'system',
          };
        }
      }

      return null;
    } catch (err) {
      logger.error('Failed to evaluate budget quests:', err);
      return null;
    }
  }

  private evaluateSensorQuests(): QuestTemplate | null {
    try {
      if (!this.sensorRegistry) return null;

      const allSensors = this.sensorRegistry.getAll();
      if (allSensors.length === 0) return null;

      const offlineSensors = allSensors.filter((s) => s.state === 'offline');
      if (offlineSensors.length === 0) return null;

      return {
        category: 'sensor',
        title: 'Reconnect',
        description: `Bring ${offlineSensors.length} offline sensor${offlineSensors.length > 1 ? 's' : ''} back online`,
        xpReward: 50,
        target: offlineSensors.length,
        expiryDays: DEFAULT_EXPIRY_DAYS,
        generatedBy: 'system',
      };
    } catch (err) {
      logger.error('Failed to evaluate sensor quests:', err);
      return null;
    }
  }

  private evaluateSeasonalQuests(): QuestTemplate | null {
    try {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const season = SEASONS.find((s) => s.months.includes(currentMonth));
      if (!season) return null;

      return {
        category: 'seasonal',
        title: season.title,
        description: season.description,
        xpReward: season.xpReward,
        target: season.target,
        expiryDays: SEASONAL_EXPIRY_DAYS,
        generatedBy: 'system',
      };
    } catch (err) {
      logger.error('Failed to evaluate seasonal quests:', err);
      return null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private templateToQuest(template: QuestTemplate): Quest {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + template.expiryDays * 24 * 60 * 60 * 1000
    ).toISOString();

    return {
      id: randomUUID(),
      title: template.title,
      description: template.description,
      xpReward: template.xpReward,
      progress: 0,
      target: template.target,
      category: template.category,
      status: 'active',
      expiresAt,
      createdAt: now.toISOString(),
      generatedBy: template.generatedBy,
    };
  }
}
