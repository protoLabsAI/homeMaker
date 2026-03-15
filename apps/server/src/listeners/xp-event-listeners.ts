/**
 * XP event listeners — subscribe to domain events from other services and
 * award XP to the gamification profile.
 *
 * After any XP award or achievement check, the Home Health Score is
 * recalculated (forced) and quest progress is updated for matching
 * quest categories.
 *
 * XP sources and amounts:
 *   maintenance_on_time          +50
 *   maintenance_late             +25
 *   asset_added                  +15 (or +25 with photo and receipt)
 *   budget_category_created      +10
 *   budget_transaction           +5
 *   monthly_budget_under_target  +100
 *   kanban_completed             +75
 *   sensor_registered            +20
 */

import { createLogger } from '@protolabsai/utils';
import type { EventEmitter } from '../lib/events.js';
import type { GamificationService } from '../services/gamification-service.js';

const logger = createLogger('XpEventListeners');

/**
 * Recalculate the Home Health Score after a gamification mutation.
 * Uses force=true to bypass the 5-minute cache, since the underlying
 * data just changed.
 */
function recalculateHealthScore(gamificationService: GamificationService): void {
  try {
    gamificationService.calculateHomeHealthScore(true);
  } catch (err) {
    logger.error('Failed to recalculate home health score:', err);
  }
}

/**
 * Increment progress on any active quests whose category matches.
 * Delegates to GamificationService.incrementQuestProgress which bumps
 * `progress` by 1 toward the quest's `target`. When progress reaches
 * the target, the quest XP reward is awarded and the quest is completed.
 */
function updateQuestProgress(gamificationService: GamificationService, category: string): void {
  try {
    gamificationService.incrementQuestProgress(
      category as import('@protolabsai/types').QuestCategory
    );
  } catch (err) {
    logger.error(`Failed to update quest progress for category "${category}":`, err);
  }
}

export function registerXpEventListeners(
  events: EventEmitter,
  gamificationService: GamificationService
): void {
  // ── Maintenance completed ─────────────────────────────────────────────
  // maintenance:tick fires when a maintenance task is marked complete.
  // The payload includes { onTime: boolean }.
  events.on('maintenance:tick', (payload) => {
    try {
      const p = payload as Record<string, unknown>;
      const onTime = p['onTime'] === true;
      const source = onTime ? 'maintenance_on_time' : 'maintenance_late';
      const amount = onTime ? 50 : 25;
      gamificationService.awardXp(source, amount);
      gamificationService.updateStreaks('maintenance', onTime);
      gamificationService.checkAchievements();
      updateQuestProgress(gamificationService, 'maintenance');
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (maintenance:tick):', err);
    }
  });

  // ── Sensor registered ──────────────────────────────────────────────────
  // sensor:registered fires when a new sensor is registered.
  events.on('sensor:registered', () => {
    try {
      gamificationService.awardXp('sensor_registered', 20);
      gamificationService.checkAchievements();
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (sensor:registered):', err);
    }
  });

  // ── Feature (kanban) completed ────────────────────────────────────────
  // feature:completed fires when a board feature moves to 'done'.
  events.on('feature:completed', () => {
    try {
      gamificationService.awardXp('kanban_completed', 75);
      gamificationService.checkAchievements();
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (feature:completed):', err);
    }
  });

  // ── Inventory asset created or updated ───────────────────────────────
  // inventory:asset-created fires when a new asset is added to the inventory.
  // Awards 25 XP if the asset has both a photo and receipt, otherwise 15 XP.
  events.on('inventory:asset-created', (payload) => {
    try {
      const p = payload as Record<string, unknown>;
      const hasPhotoAndReceipt = p['hasPhotoAndReceipt'] === true;
      const amount = hasPhotoAndReceipt ? 25 : 15;
      gamificationService.awardXp('asset_added', amount);
      gamificationService.checkAchievements();
      updateQuestProgress(gamificationService, 'inventory');
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (inventory:asset-created):', err);
    }
  });

  // inventory:asset-updated fires when an existing asset is modified.
  events.on('inventory:asset-updated', () => {
    try {
      gamificationService.checkAchievements();
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (inventory:asset-updated):', err);
    }
  });

  // ── Budget category created ───────────────────────────────────────────
  // budget:category-created fires when a new budget category is added.
  events.on('budget:category-created', () => {
    try {
      gamificationService.awardXp('budget_category_created', 10);
      gamificationService.checkAchievements();
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (budget:category-created):', err);
    }
  });

  // ── Budget transaction created ────────────────────────────────────────
  // budget:transaction-created fires when a new budget transaction is logged.
  events.on('budget:transaction-created', () => {
    try {
      gamificationService.awardXp('budget_transaction', 5);
      gamificationService.checkAchievements();
      updateQuestProgress(gamificationService, 'budget');
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (budget:transaction-created):', err);
    }
  });

  // ── Budget month closed ────────────────────────────────────────────────
  // budget:month-closed fires when the first transaction of a new month is
  // added, closing out the previous month. Payload: { underBudget: boolean }.
  events.on('budget:month-closed', (payload) => {
    try {
      const p = payload as Record<string, unknown>;
      const underBudget = p['underBudget'] === true;
      if (underBudget) {
        gamificationService.awardXp('monthly_budget_under_target', 100);
      }
      gamificationService.updateStreaks('budget', underBudget);
      gamificationService.checkAchievements();
      recalculateHealthScore(gamificationService);
    } catch (err) {
      logger.error('XP listener error (budget:month-closed):', err);
    }
  });

  logger.info('XP event listeners registered');
}
