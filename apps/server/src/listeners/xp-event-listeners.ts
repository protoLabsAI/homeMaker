/**
 * XP event listeners — subscribe to domain events from other services and
 * award XP to the gamification profile.
 *
 * XP sources and amounts:
 *   maintenance_on_time          +50
 *   maintenance_late             +25
 *   asset_added                  +15
 *   asset_with_photo_receipt     +25 (bonus on top of asset_added)
 *   budget_transaction           +5
 *   monthly_budget_under_target  +100
 *   kanban_completed             +75
 *   sensor_registered            +20
 */

import { createLogger } from '@protolabsai/utils';
import type { EventEmitter } from '../lib/events.js';
import type { GamificationService } from '../services/gamification-service.js';

const logger = createLogger('XpEventListeners');

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
    } catch (err) {
      logger.error('XP listener error (maintenance:tick):', err);
    }
  });

  // ── Asset added ───────────────────────────────────────────────────────
  // sensor:registered fires when a new sensor is registered.
  events.on('sensor:registered', () => {
    try {
      gamificationService.awardXp('sensor_registered', 20);
      gamificationService.checkAchievements();
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
    } catch (err) {
      logger.error('XP listener error (feature:completed):', err);
    }
  });

  logger.info('XP event listeners registered');
}
