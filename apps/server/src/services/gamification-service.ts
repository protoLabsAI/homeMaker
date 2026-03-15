/**
 * GamificationService — core gamification engine for homeMaker.
 *
 * Persists all state to the shared homemaker.db:
 *   - gamification_profile  (single row, JSON fields for streaks + health score)
 *   - earned_achievements   (id, unlockedAt, seen)
 *   - xp_history            (append-only XP ledger)
 *   - active_quests         (short-term goals)
 *
 * Public API:
 *   getProfile()               → full GamificationProfile
 *   awardXp(source, amount)    → XpAwardResult + emits events
 *   checkAchievements()        → evaluates catalog, unlocks new ones
 *   updateStreaks(type, done)   → maintenance or budget streak
 *   calculateHomeHealthScore() → computes 4-pillar score
 *   getAchievements()          → catalog with earned status
 *   markAchievementSeen(id)    → dismiss "new" badge
 *   getQuests()                → active quest list
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  GamificationProfile,
  EarnedAchievement,
  AchievementWithStatus,
  Quest,
  QuestCategory,
  QuestStatus,
  XpAwardResult,
  StreakState,
  MonthlyStreakState,
  HomeHealthScore,
} from '@protolabsai/types';
import type { EventEmitter } from '../lib/events.js';
import { calculateLevel } from '../utils/level-calculator.js';
import { calculateHomeHealthScore } from '../utils/health-score-calculator.js';
import { evaluateAchievements } from './achievement-evaluator.js';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog.js';

/** Maximum number of active quests at any time */
const MAX_ACTIVE_QUESTS = 3;

/** Minimum score delta that triggers a health-score-changed event */
const HEALTH_SCORE_EVENT_THRESHOLD = 2;

/** How long a cached health score is considered fresh (5 minutes) */
const HEALTH_SCORE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Minimal sensor registry interface (avoids circular dependency) */
interface SensorRegistryLike {
  getAll(): Array<{ sensor: { id: string }; state: 'active' | 'stale' | 'offline' }>;
}

const logger = createLogger('GamificationService');

/** Shape of the gamification_profile row */
interface ProfileRow {
  id: number;
  xp: number;
  level: number;
  streaks: string;
  homeHealthScore: string;
  updatedAt: string;
}

/** Shape of an earned_achievements row */
interface EarnedRow {
  id: string;
  unlockedAt: string;
  seen: number;
}

/** Shape of an active_quests row */
interface QuestRow {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  category: string;
  status: string;
  expiresAt: string | null;
  completedAt: string | null;
  generatedBy: string;
  createdAt: string;
}

const DEFAULT_STREAKS = {
  maintenance: { current: 0, best: 0, lastCompletedAt: null } satisfies StreakState,
  budget: { current: 0, best: 0, lastMonth: null } satisfies MonthlyStreakState,
};

const DEFAULT_HEALTH_SCORE: HomeHealthScore = {
  total: 0,
  maintenance: 0,
  inventory: 0,
  budget: 0,
  systems: 0,
  calculatedAt: new Date(0).toISOString(),
  pillarHints: [],
};

export class GamificationService {
  private db: BetterSqlite3.Database;
  private events?: EventEmitter;
  private sensorRegistry?: SensorRegistryLike;

  constructor(
    db: BetterSqlite3.Database,
    events?: EventEmitter,
    sensorRegistry?: SensorRegistryLike
  ) {
    this.db = db;
    this.events = events;
    this.sensorRegistry = sensorRegistry;
    this.ensureProfileRow();
  }

  /**
   * Ensure the single profile row exists (id=1).
   */
  private ensureProfileRow(): void {
    const existing = this.db.prepare('SELECT id FROM gamification_profile WHERE id = 1').get();
    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO gamification_profile (id, xp, level, streaks, homeHealthScore, updatedAt)
           VALUES (1, 0, 1, ?, ?, ?)`
        )
        .run(
          JSON.stringify(DEFAULT_STREAKS),
          JSON.stringify(DEFAULT_HEALTH_SCORE),
          new Date().toISOString()
        );
    }
  }

  // ── Profile ─────────────────────────────────────────────────────────────

  /** Return the full gamification profile for the household. */
  getProfile(): GamificationProfile {
    const row = this.db
      .prepare('SELECT * FROM gamification_profile WHERE id = 1')
      .get() as ProfileRow;

    const levelInfo = calculateLevel(row.xp);
    const streaks = JSON.parse(row.streaks) as {
      maintenance: StreakState;
      budget: MonthlyStreakState;
    };
    const homeHealthScore = JSON.parse(row.homeHealthScore) as HomeHealthScore;
    const achievements = this.getEarnedAchievements();

    return {
      xp: row.xp,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      xpToNextLevel: levelInfo.xpToNextLevel,
      achievements,
      streaks,
      homeHealthScore,
    };
  }

  private getEarnedAchievements(): EarnedAchievement[] {
    const rows = this.db
      .prepare('SELECT id, unlockedAt, seen FROM earned_achievements')
      .all() as EarnedRow[];
    return rows.map((r) => ({ id: r.id, unlockedAt: r.unlockedAt, seen: r.seen === 1 }));
  }

  // ── XP ───────────────────────────────────────────────────────────────────

  /**
   * Award XP to the profile from the given source.
   * Multiplier is rounded down before applying (per deviation rules).
   * Emits 'gamification:xp-gained' and 'gamification:level-up' if applicable.
   */
  awardXp(source: string, amount: number, multiplier = 1.0): XpAwardResult {
    const safeMultiplier = Math.max(0, multiplier);
    const effectiveAmount = Math.floor(amount * safeMultiplier);

    if (effectiveAmount <= 0) {
      const profile = this.getProfile();
      return {
        xpGained: 0,
        newTotal: profile.xp,
        leveledUp: false,
        newLevel: profile.level,
        newTitle: profile.levelTitle,
      };
    }

    const row = this.db
      .prepare('SELECT xp, level FROM gamification_profile WHERE id = 1')
      .get() as Pick<ProfileRow, 'xp' | 'level'>;

    const oldLevel = row.level;
    const newXp = row.xp + effectiveAmount;
    const levelInfo = calculateLevel(newXp);
    const leveledUp = levelInfo.level > oldLevel;
    const now = new Date().toISOString();

    // Persist XP and level in a transaction
    this.db
      .prepare(`UPDATE gamification_profile SET xp = ?, level = ?, updatedAt = ? WHERE id = 1`)
      .run(newXp, levelInfo.level, now);

    // Record XP history
    this.db
      .prepare(
        `INSERT INTO xp_history (id, source, amount, multiplier, timestamp)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(randomUUID(), source, effectiveAmount, safeMultiplier, now);

    const result: XpAwardResult = {
      xpGained: effectiveAmount,
      newTotal: newXp,
      leveledUp,
      newLevel: levelInfo.level,
      newTitle: levelInfo.title,
    };

    // Emit events — per deviation rules: failure to emit does NOT block the XP record
    try {
      this.events?.emit('gamification:xp-gained', {
        source,
        amount: effectiveAmount,
        newTotal: newXp,
        ...(leveledUp ? { leveledUp, newLevel: levelInfo.level, newTitle: levelInfo.title } : {}),
      });

      if (leveledUp) {
        this.events?.emit('gamification:level-up', {
          level: levelInfo.level,
          title: levelInfo.title,
          xp: newXp,
        });
      }
    } catch (err) {
      logger.error('Failed to emit XP events (XP was still awarded):', err);
    }

    return result;
  }

  // ── Achievements ─────────────────────────────────────────────────────────

  /**
   * Evaluate all achievement conditions and unlock any newly earned ones.
   * Per deviation rules: errors in individual conditions are caught and skipped.
   */
  checkAchievements(): void {
    const earned = this.getEarnedAchievements();
    const earnedIds = new Set(earned.map((a) => a.id));
    const profile = this.getProfile();

    const newlyUnlocked = evaluateAchievements(earnedIds, { profile, db: this.db });

    for (const achievement of newlyUnlocked) {
      const now = new Date().toISOString();

      this.db
        .prepare(
          `INSERT OR IGNORE INTO earned_achievements (id, unlockedAt, seen)
           VALUES (?, ?, 0)`
        )
        .run(achievement.id, now);

      // Award XP for the achievement (no further achievement checks to avoid recursion)
      if (achievement.xpReward > 0) {
        const row = this.db
          .prepare('SELECT xp, level FROM gamification_profile WHERE id = 1')
          .get() as Pick<ProfileRow, 'xp' | 'level'>;
        const newXp = row.xp + achievement.xpReward;
        const levelInfo = calculateLevel(newXp);
        this.db
          .prepare(`UPDATE gamification_profile SET xp = ?, level = ?, updatedAt = ? WHERE id = 1`)
          .run(newXp, levelInfo.level, new Date().toISOString());

        this.db
          .prepare(
            `INSERT INTO xp_history (id, source, amount, multiplier, timestamp)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(randomUUID(), `achievement:${achievement.id}`, achievement.xpReward, 1.0, now);
      }

      // Emit achievement unlocked event
      try {
        this.events?.emit('gamification:achievement-unlocked', {
          achievement,
          xpReward: achievement.xpReward,
        });
      } catch (err) {
        logger.error(
          `Failed to emit achievement-unlocked for "${achievement.id}" (still recorded):`,
          err
        );
      }

      logger.info(`Achievement unlocked: "${achievement.title}" (+${achievement.xpReward} XP)`);
    }
  }

  /** Return all achievements with their earned status.
   *
   * Hidden achievements (secret category with hidden: true) are returned with
   * title and description redacted until earned, so their existence is hinted
   * at but their details remain a surprise.
   */
  getAchievements(): AchievementWithStatus[] {
    const earned = this.getEarnedAchievements();
    const earnedMap = new Map(earned.map((a) => [a.id, a]));

    return ACHIEVEMENT_CATALOG.map((def) => {
      const earnedEntry = earnedMap.get(def.id);
      const isHidden = def.hidden === true;
      const isEarned = !!earnedEntry;

      // Mask hidden achievements until earned
      if (isHidden && !isEarned) {
        return {
          ...def,
          title: '???',
          description: 'This secret achievement is hidden until unlocked.',
          earned: false,
          unlockedAt: null,
          seen: false,
          hidden: true,
        };
      }

      return {
        ...def,
        earned: isEarned,
        unlockedAt: earnedEntry?.unlockedAt ?? null,
        seen: earnedEntry?.seen ?? false,
        hidden: isHidden,
      };
    });
  }

  /** Mark an achievement as seen (dismiss the "new" indicator). */
  markAchievementSeen(id: string): boolean {
    const result = this.db.prepare('UPDATE earned_achievements SET seen = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ── Streaks ──────────────────────────────────────────────────────────────

  /**
   * Update a streak based on whether the activity was completed.
   * 'maintenance' uses a count-based streak; 'budget' uses monthly.
   */
  updateStreaks(type: 'maintenance' | 'budget', completed: boolean): void {
    const row = this.db
      .prepare('SELECT streaks FROM gamification_profile WHERE id = 1')
      .get() as Pick<ProfileRow, 'streaks'>;

    const streaks = JSON.parse(row.streaks) as {
      maintenance: StreakState;
      budget: MonthlyStreakState;
    };
    const now = new Date().toISOString();

    if (type === 'maintenance') {
      const streak = streaks.maintenance;
      if (completed) {
        streak.current += 1;
        streak.best = Math.max(streak.best, streak.current);
        streak.lastCompletedAt = now;
      } else {
        streak.current = 0;
      }

      this.db
        .prepare('UPDATE gamification_profile SET streaks = ?, updatedAt = ? WHERE id = 1')
        .run(JSON.stringify(streaks), now);

      try {
        this.events?.emit('gamification:streak-updated', {
          type: 'maintenance',
          current: streak.current,
          best: streak.best,
          isNewBest: streak.current === streak.best && streak.current > 0,
        });
      } catch (err) {
        logger.error('Failed to emit streak-updated event:', err);
      }
    } else {
      // Budget streak — track by month string (e.g. "2026-03")
      const streak = streaks.budget;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      if (completed) {
        streak.current += 1;
        streak.best = Math.max(streak.best, streak.current);
        streak.lastMonth = currentMonth;
      } else {
        streak.current = 0;
      }

      this.db
        .prepare('UPDATE gamification_profile SET streaks = ?, updatedAt = ? WHERE id = 1')
        .run(JSON.stringify(streaks), now);

      try {
        this.events?.emit('gamification:streak-updated', {
          type: 'budget',
          current: streak.current,
          best: streak.best,
          isNewBest: streak.current === streak.best && streak.current > 0,
        });
      } catch (err) {
        logger.error('Failed to emit streak-updated event:', err);
      }
    }
  }

  // ── Home Health Score ─────────────────────────────────────────────────────

  /**
   * Recompute the home health score from live data and cache the result.
   *
   * The cached score is reused if it was calculated within the last 5 minutes,
   * unless `force` is true (called after a relevant mutation).
   *
   * Emits 'gamification:health-score-changed' when the total changes by 2+ points.
   */
  calculateHomeHealthScore(force = false): HomeHealthScore {
    const row = this.db
      .prepare('SELECT homeHealthScore FROM gamification_profile WHERE id = 1')
      .get() as Pick<ProfileRow, 'homeHealthScore'>;

    const oldScore = JSON.parse(row.homeHealthScore) as HomeHealthScore;

    // Return cached result if still fresh and not forced
    if (!force) {
      const cacheAgeMs = Date.now() - new Date(oldScore.calculatedAt).getTime();
      if (cacheAgeMs < HEALTH_SCORE_CACHE_TTL_MS && oldScore.total > 0) {
        return oldScore;
      }
    }

    const newScore = calculateHomeHealthScore({ db: this.db, sensorRegistry: this.sensorRegistry });

    this.db
      .prepare('UPDATE gamification_profile SET homeHealthScore = ?, updatedAt = ? WHERE id = 1')
      .run(JSON.stringify(newScore), new Date().toISOString());

    // Only emit event when score changes by 2+ points
    if (Math.abs(newScore.total - oldScore.total) >= HEALTH_SCORE_EVENT_THRESHOLD) {
      try {
        this.events?.emit('gamification:health-score-changed', {
          old: oldScore.total,
          new: newScore.total,
          pillarChanges: {
            maintenance: newScore.maintenance - oldScore.maintenance,
            inventory: newScore.inventory - oldScore.inventory,
            budget: newScore.budget - oldScore.budget,
            systems: newScore.systems - oldScore.systems,
          },
        });
      } catch (err) {
        logger.error('Failed to emit health-score-changed event:', err);
      }
    }

    return newScore;
  }

  // ── Quests ───────────────────────────────────────────────────────────────

  /** Return all active (non-expired) quests. Silently removes expired quests. */
  getQuests(): Quest[] {
    const now = new Date().toISOString();

    // Mark expired quests
    const expiredRows = this.db
      .prepare(
        `SELECT id, title FROM active_quests
         WHERE status = 'active' AND expiresAt IS NOT NULL AND expiresAt < ?`
      )
      .all(now) as Array<{ id: string; title: string }>;

    if (expiredRows.length > 0) {
      const markExpired = this.db.prepare(
        `UPDATE active_quests SET status = 'expired' WHERE id = ?`
      );
      for (const row of expiredRows) {
        markExpired.run(row.id);
        try {
          this.events?.emit('gamification:quest-expired', {
            questId: row.id,
            title: row.title,
            timestamp: now,
          });
        } catch (err) {
          logger.error(`Failed to emit quest-expired for "${row.id}":`, err);
        }
      }
      // Delete expired quests after emitting events
      this.db.prepare(`DELETE FROM active_quests WHERE status = 'expired'`).run();
    }

    const rows = this.db
      .prepare(`SELECT * FROM active_quests WHERE status = 'active' ORDER BY createdAt DESC`)
      .all() as QuestRow[];

    return rows.map(this.rowToQuest);
  }

  /** Return the count of currently active quests. */
  getActiveQuestCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM active_quests WHERE status = 'active'`)
      .get() as { count: number };
    return row.count;
  }

  /** Check whether an active quest of the given category already exists. */
  hasActiveQuestOfCategory(category: QuestCategory): boolean {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM active_quests WHERE status = 'active' AND category = ?`
      )
      .get(category) as { count: number };
    return row.count > 0;
  }

  /**
   * Insert a new quest into the active_quests table.
   * Returns null if the maximum active quest limit (3) is reached or a
   * quest of the same category already exists.
   */
  insertQuest(quest: Quest): Quest | null {
    if (this.getActiveQuestCount() >= MAX_ACTIVE_QUESTS) {
      logger.warn('Max active quests reached, skipping quest insertion');
      return null;
    }

    if (this.hasActiveQuestOfCategory(quest.category)) {
      logger.warn(`Active quest of category "${quest.category}" already exists, skipping`);
      return null;
    }

    this.db
      .prepare(
        `INSERT INTO active_quests
           (id, title, description, xpReward, progress, target, category, status, expiresAt, completedAt, generatedBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        quest.id,
        quest.title,
        quest.description,
        quest.xpReward,
        quest.progress,
        quest.target,
        quest.category,
        quest.status,
        quest.expiresAt ?? null,
        quest.completedAt ?? null,
        quest.generatedBy,
        quest.createdAt
      );

    try {
      this.events?.emit('gamification:quest-generated', {
        questId: quest.id,
        title: quest.title,
        category: quest.category,
        xpReward: quest.xpReward,
        generatedBy: quest.generatedBy,
        timestamp: quest.createdAt,
      });
    } catch (err) {
      logger.error(`Failed to emit quest-generated for "${quest.id}":`, err);
    }

    return quest;
  }

  /**
   * Increment progress on all active quests matching the given category.
   * When progress reaches the target, the quest is completed and XP is awarded.
   */
  incrementQuestProgress(category: QuestCategory, amount = 1): void {
    const quests = this.db
      .prepare(`SELECT * FROM active_quests WHERE status = 'active' AND category = ?`)
      .all(category) as QuestRow[];

    for (const quest of quests) {
      const newProgress = Math.min(quest.target, Math.max(0, quest.progress + amount));

      this.db
        .prepare(`UPDATE active_quests SET progress = ? WHERE id = ?`)
        .run(newProgress, quest.id);

      try {
        this.events?.emit('gamification:quest-progress', {
          questId: quest.id,
          title: quest.title,
          category: quest.category,
          progress: newProgress,
          target: quest.target,
        });
      } catch (err) {
        logger.error(`Failed to emit quest-progress for "${quest.id}":`, err);
      }

      if (newProgress >= quest.target) {
        this.completeQuestById(quest.id);
      }
    }
  }

  /**
   * Complete a quest by ID: mark completed, award XP.
   * Returns the completed quest, or null if quest not found or already completed.
   * Per deviation rules: checks progress before awarding XP to prevent double XP.
   */
  completeQuestById(questId: string): Quest | null {
    const row = this.db.prepare(`SELECT * FROM active_quests WHERE id = ?`).get(questId) as
      | QuestRow
      | undefined;

    if (!row || row.status !== 'active') {
      return null;
    }

    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE active_quests SET status = 'completed', completedAt = ?, progress = ? WHERE id = ?`
      )
      .run(now, row.target, questId);

    // Award XP through the official channel
    const xpResult = this.awardXp(`quest:${questId}`, row.xpReward);

    try {
      this.events?.emit('gamification:quest-completed', {
        questId,
        title: row.title,
        category: row.category,
        xpReward: row.xpReward,
        xpResult,
        timestamp: now,
      });
    } catch (err) {
      logger.error(`Failed to emit quest-completed for "${questId}":`, err);
    }

    logger.info(`Quest completed: "${row.title}" (+${row.xpReward} XP)`);

    return {
      ...this.rowToQuest(row),
      status: 'completed',
      completedAt: now,
      progress: row.target,
    };
  }

  /** Convert a database row to a Quest object. */
  private rowToQuest(r: QuestRow): Quest {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      xpReward: r.xpReward,
      progress: Math.max(0, r.progress),
      target: r.target,
      category: r.category as QuestCategory,
      status: (r.status ?? 'active') as QuestStatus,
      createdAt: r.createdAt,
      ...(r.expiresAt ? { expiresAt: r.expiresAt } : {}),
      ...(r.completedAt ? { completedAt: r.completedAt } : {}),
      generatedBy: r.generatedBy as 'system' | 'ava',
    };
  }
}
