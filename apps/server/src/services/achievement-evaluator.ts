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

  // ── Onboarding — specific home milestones ─────────────────────────────
  homeowner: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'kanban_completed'")
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  connected_home: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'sensor_registered'")
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  scheduled: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM maintenance_schedules').get() as {
        cnt: number;
      };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  budgeted: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'budget_category_created'")
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  vault_keeper: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM vault_entries').get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },

  // ── Maintenance — milestone counts ────────────────────────────────────
  on_schedule: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'maintenance_on_time'")
        .get() as { cnt: number };
      return row.cnt >= 3;
    } catch {
      return false;
    }
  },
  clockwork: ({ db }) => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) as cnt FROM xp_history WHERE source = 'maintenance_on_time'")
        .get() as { cnt: number };
      return row.cnt >= 10;
    } catch {
      return false;
    }
  },
  preventive_pro: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(DISTINCT
            substr(timestamp, 1, 4) || '-Q' ||
            CASE
              WHEN CAST(substr(timestamp, 6, 2) AS INTEGER) BETWEEN 1 AND 3 THEN '1'
              WHEN CAST(substr(timestamp, 6, 2) AS INTEGER) BETWEEN 4 AND 6 THEN '2'
              WHEN CAST(substr(timestamp, 6, 2) AS INTEGER) BETWEEN 7 AND 9 THEN '3'
              ELSE '4'
            END
          ) as quarters
          FROM xp_history WHERE source = 'maintenance_on_time'`
        )
        .get() as { quarters: number };
      return row.quarters >= 4;
    } catch {
      return false;
    }
  },
  year_of_prevention: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(DISTINCT substr(timestamp, 1, 7)) as months
           FROM xp_history WHERE source = 'maintenance_on_time'`
        )
        .get() as { months: number };
      return row.months >= 12;
    } catch {
      return false;
    }
  },
  zero_overdue: ({ db }) => {
    try {
      const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM maintenance_schedules').get() as {
        cnt: number;
      };
      if (totalRow.cnt === 0) return false;
      const overdueRow = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM maintenance_schedules
           WHERE nextDueAt IS NOT NULL AND nextDueAt < datetime('now')
           AND (lastCompletedAt IS NULL OR lastCompletedAt < nextDueAt)`
        )
        .get() as { cnt: number };
      return overdueRow.cnt === 0;
    } catch {
      return false;
    }
  },

  // ── Inventory — deeper milestones ─────────────────────────────────────
  cataloger: ({ db }) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number };
      return row.cnt >= 50;
    } catch {
      return false;
    }
  },
  museum_curator: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM assets
           WHERE photoUrls IS NOT NULL AND photoUrls != '[]'`
        )
        .get() as { cnt: number };
      return row.cnt >= 10;
    } catch {
      return false;
    }
  },
  warranty_warrior: ({ db }) => {
    try {
      const row = db
        .prepare('SELECT COUNT(*) as cnt FROM assets WHERE warrantyExpiration IS NOT NULL')
        .get() as { cnt: number };
      return row.cnt >= 10;
    } catch {
      return false;
    }
  },

  // ── Budget — long streaks ─────────────────────────────────────────────
  financial_fortress: ({ profile }) => profile.streaks.budget.current >= 12,

  // ── Seasonal ──────────────────────────────────────────────────────────
  winter_ready: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM xp_history
           WHERE source = 'maintenance_on_time'
           AND CAST(substr(timestamp, 6, 2) AS INTEGER) IN (12, 1, 2)`
        )
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  spring_fresh: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM xp_history
           WHERE source = 'maintenance_on_time'
           AND CAST(substr(timestamp, 6, 2) AS INTEGER) IN (3, 4, 5)`
        )
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  summer_set: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM xp_history
           WHERE source = 'maintenance_on_time'
           AND CAST(substr(timestamp, 6, 2) AS INTEGER) IN (6, 7, 8)`
        )
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  fall_prepared: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM xp_history
           WHERE source = 'maintenance_on_time'
           AND CAST(substr(timestamp, 6, 2) AS INTEGER) IN (9, 10, 11)`
        )
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },

  // ── Secret — hidden until earned ──────────────────────────────────────
  night_owl: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM xp_history
           WHERE CAST(strftime('%H', timestamp) AS INTEGER) < 5
           AND source IN (
             'maintenance_on_time', 'maintenance_late', 'asset_added',
             'budget_transaction', 'kanban_completed'
           )`
        )
        .get() as { cnt: number };
      return row.cnt >= 1;
    } catch {
      return false;
    }
  },
  speed_demon: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT MAX(daily_count) as max_count FROM (
             SELECT date(timestamp) as day, COUNT(*) as daily_count
             FROM xp_history
             WHERE source IN ('maintenance_on_time', 'maintenance_late')
             GROUP BY date(timestamp)
           ) sub`
        )
        .get() as { max_count: number | null };
      return (row.max_count ?? 0) >= 5;
    } catch {
      return false;
    }
  },
  explorer: ({ db }) => {
    try {
      const row = db
        .prepare(
          `SELECT COUNT(DISTINCT source) as cnt FROM xp_history
           WHERE source IN (
             'kanban_completed', 'sensor_registered', 'asset_added', 'budget_transaction'
           )`
        )
        .get() as { cnt: number };
      return row.cnt >= 4;
    } catch {
      return false;
    }
  },
  centurion: ({ profile }) => profile.homeHealthScore.total >= 100,
  streak_master: ({ profile }) =>
    profile.streaks.maintenance.best >= 25 || profile.streaks.budget.best >= 25,
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
