/**
 * Achievement evaluator — checks current profile state against all achievement
 * conditions and returns a list of newly unlocked achievement IDs.
 *
 * Called by GamificationService.checkAchievements() after any state change.
 * Each evaluator is pure: receives the current snapshot and returns boolean.
 */

import * as BetterSqlite3 from 'better-sqlite3';
import type { GamificationProfile, AchievementDefinition } from '@protolabsai/types';
import { createLogger } from '@protolabsai/utils';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog.js';

const logger = createLogger('AchievementEvaluator');

export interface EvaluationContext {
  profile: GamificationProfile;
  db: BetterSqlite3.Database;
}

type AchievementCondition = (ctx: EvaluationContext) => boolean;

/** Map of achievement id → condition function */
const CONDITIONS: Record<string, AchievementCondition> = {
  // ── Onboarding ───────────────────────────────────────────────────────────
  first_steps: ({ profile }) => profile.xp >= 1,
  getting_started: ({ profile }) => profile.level >= 2,

  // ── Maintenance ──────────────────────────────────────────────────────────
  maintenance_streak_3: ({ profile }) => profile.streaks.maintenance.current >= 3,
  maintenance_streak_7: ({ profile }) => profile.streaks.maintenance.current >= 7,
  maintenance_streak_30: ({ profile }) => profile.streaks.maintenance.current >= 30,
  maintenance_best_10: ({ profile }) => profile.streaks.maintenance.best >= 10,
  on_time_5: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'maintenance_on_time'")
        .get() as { cnt: number };
      return row.cnt >= 5;
    } catch {
      return false;
    }
  },
  on_time_25: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'maintenance_on_time'")
        .get() as { cnt: number };
      return row.cnt >= 25;
    } catch {
      return false;
    }
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  first_asset: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  asset_collector_10: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number };
      return row.cnt >= 10;
    } catch {
      return false;
    }
  },
  asset_collector_25: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number };
      return row.cnt >= 25;
    } catch {
      return false;
    }
  },
  warranty_tracker: ({ db }) => {
    try {
      const row = db
        .prepare('SELECT COUNT(*) as cnt FROM assets WHERE warrantyExpiration IS NOT NULL')
        .get() as { cnt: number };
      return row.cnt >= 5;
    } catch {
      return false;
    }
  },

  // ── Budget ───────────────────────────────────────────────────────────────
  first_transaction: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM transactions').get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  budget_conscious: ({ profile }) => profile.streaks.budget.current >= 1,
  budget_streak_3: ({ profile }) => profile.streaks.budget.current >= 3,
  budget_streak_6: ({ profile }) => profile.streaks.budget.current >= 6,

  // ── Levels ───────────────────────────────────────────────────────────────
  level_5: ({ profile }) => profile.level >= 5,
  level_10: ({ profile }) => profile.level >= 10,

  // ── Secret ───────────────────────────────────────────────────────────────
  xp_milestone_10k: ({ profile }) => profile.xp >= 10000,
  xp_milestone_50k: ({ profile }) => profile.xp >= 50000,
};

/**
 * Evaluate all achievements and return IDs of those that are newly unlocked.
 *
 * @param earnedIds - Set of already-earned achievement IDs (skipped)
 * @param ctx - Evaluation context with profile snapshot and db
 */
export function evaluateAchievements(
  earnedIds: Set<string>,
  ctx: EvaluationContext
): AchievementDefinition[] {
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const achievement of ACHIEVEMENT_CATALOG) {
    if (earnedIds.has(achievement.id)) continue;

    const condition = CONDITIONS[achievement.id];
    if (!condition) continue;

    try {
      if (condition(ctx)) {
        newlyUnlocked.push(achievement);
      }
    } catch (err) {
      logger.error(`Achievement condition error for "${achievement.id}":`, err);
      // Per deviation rules: skip this achievement, continue evaluating others
    }
  }

  return newlyUnlocked;
}
