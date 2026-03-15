/**
 * Home Health Score calculator.
 *
 * Computes a 0-100 score from 4 equal pillars (each 0-25):
 *
 *   Maintenance (0-25):
 *     - On-time completion rate last 6 months: 0-15 pts
 *     - Overdue penalty: -2 per overdue task (min 0 for sub-score)
 *     - Streak bonus: +1 per 5 consecutive completions (max +5)
 *
 *   Inventory (0-25):
 *     - Asset count: 0-10 pts (0=0, 1-9=3, 10-24=6, 25-49=8, 50+=10)
 *     - Documentation quality: 0-10 pts (photos 5pts + warranty dates 5pts)
 *     - Warranty tracking: 0-5 pts (% of purchase-dated assets with expiry)
 *
 *   Budget (0-25):
 *     - Current month status: 0-10 pts
 *     - 3-month trend: 0-10 pts (improving=10, steady=7, declining=3)
 *     - Budget streak bonus: 0-5 pts
 *
 *   Systems (0-25):
 *     - Active sensor ratio: 0-15 pts
 *     - Sensor count: 0-5 pts (0=0, 1-3=2, 4-7=4, 8+=5)
 *     - Vault usage: 0-5 pts (has secrets = 5)
 */

import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type { HomeHealthScore } from '@protolabsai/types';

const logger = createLogger('HealthScoreCalculator');

/** Minimal interface for sensor registry access (avoids circular dep) */
interface SensorRegistryLike {
  getAll(): Array<{ sensor: { id: string }; state: 'active' | 'stale' | 'offline' }>;
}

interface ScoreInputs {
  db: BetterSqlite3.Database;
  sensorRegistry?: SensorRegistryLike;
}

interface PillarResult {
  score: number;
  hints: string[];
}

// ── Maintenance ──────────────────────────────────────────────────────────────

function calcMaintenanceScore(db: BetterSqlite3.Database): PillarResult {
  try {
    const total = (db.prepare('SELECT COUNT(*) as cnt FROM maintenance').get() as { cnt: number })
      .cnt;

    if (total === 0) {
      return {
        score: 0,
        hints: ['Add maintenance schedules to improve your Maintenance score'],
      };
    }

    const hints: string[] = [];
    const now = new Date().toISOString();
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    // On-time completion rate: distinct schedules completed in the last 6 months
    const completedInPeriod = (
      db
        .prepare(
          'SELECT COUNT(DISTINCT scheduleId) as cnt FROM maintenance_completions WHERE completedAt >= ?'
        )
        .get(sixMonthsAgo) as { cnt: number }
    ).cnt;

    const onTimeRate = Math.min(1, completedInPeriod / total);
    const completionPts = Math.round(15 * onTimeRate);

    // Overdue penalty: -2 per task with nextDueAt in the past
    const overdue = (
      db.prepare('SELECT COUNT(*) as cnt FROM maintenance WHERE nextDueAt < ?').get(now) as {
        cnt: number;
      }
    ).cnt;

    const penalizedPts = Math.max(0, completionPts - overdue * 2);

    if (overdue > 0) {
      hints.push(
        `Complete ${overdue} overdue maintenance task${overdue > 1 ? 's' : ''} to stop losing points`
      );
    }

    // Streak bonus: +1 per 5 consecutive on-time completions (max +5)
    const profileRow = db.prepare('SELECT streaks FROM gamification_profile WHERE id = 1').get() as
      | { streaks: string }
      | undefined;

    let streakBonus = 0;
    if (profileRow) {
      const streaks = JSON.parse(profileRow.streaks) as {
        maintenance?: { current: number };
      };
      const current = streaks.maintenance?.current ?? 0;
      streakBonus = Math.min(5, Math.floor(current / 5));
    }

    const score = Math.min(25, penalizedPts + streakBonus);
    return { score, hints };
  } catch (err) {
    logger.warn('Failed to calculate maintenance score:', err);
    return { score: 0, hints: [] };
  }
}

// ── Inventory ────────────────────────────────────────────────────────────────

function calcInventoryScore(db: BetterSqlite3.Database): PillarResult {
  try {
    const total = (db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number }).cnt;

    if (total === 0) {
      return {
        score: 0,
        hints: ['Add home assets to your inventory to improve your Inventory score'],
      };
    }

    const hints: string[] = [];

    // Asset count: 0-10 pts
    let assetCountPts: number;
    if (total < 10) assetCountPts = 3;
    else if (total < 25) assetCountPts = 6;
    else if (total < 50) assetCountPts = 8;
    else assetCountPts = 10;

    // Photos: % of assets with at least one photo (5 pts max)
    // photoUrls stored as JSON array string — non-empty array has length > 2 chars ('[]')
    const withPhotos = (
      db
        .prepare(
          `SELECT COUNT(*) as cnt FROM assets WHERE photoUrls IS NOT NULL AND LENGTH(photoUrls) > 2`
        )
        .get() as { cnt: number }
    ).cnt;
    const photoPts = Math.round(5 * (withPhotos / total));

    // Warranty dates: % of assets with warrantyExpiration set (5 pts max)
    const withWarrantyDate = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM assets WHERE warrantyExpiration IS NOT NULL')
        .get() as { cnt: number }
    ).cnt;
    const warrantyDatePts = Math.round(5 * (withWarrantyDate / total));

    const docQuality = photoPts + warrantyDatePts;

    // Warranty tracking: % of purchase-dated assets that also have expiry tracked (0-5 pts)
    const withPurchaseDate = (
      db.prepare('SELECT COUNT(*) as cnt FROM assets WHERE purchaseDate IS NOT NULL').get() as {
        cnt: number;
      }
    ).cnt;

    let warrantyTrackPts = 0;
    if (withPurchaseDate > 0) {
      const trackedWarranties = (
        db
          .prepare(
            'SELECT COUNT(*) as cnt FROM assets WHERE purchaseDate IS NOT NULL AND warrantyExpiration IS NOT NULL'
          )
          .get() as { cnt: number }
      ).cnt;
      warrantyTrackPts = Math.round(5 * (trackedWarranties / withPurchaseDate));
    }

    // Hints
    const withoutWarranty = total - withWarrantyDate;
    if (withoutWarranty > 0 && warrantyDatePts < 5) {
      hints.push(
        `Add warranty dates to ${withoutWarranty} asset${withoutWarranty > 1 ? 's' : ''} to gain up to ${5 - warrantyDatePts} points`
      );
    }
    const withoutPhotos = total - withPhotos;
    if (withoutPhotos > 0 && photoPts < 5) {
      hints.push(
        `Add photos to ${withoutPhotos} asset${withoutPhotos > 1 ? 's' : ''} to gain up to ${5 - photoPts} points`
      );
    }

    const score = Math.min(25, assetCountPts + docQuality + warrantyTrackPts);
    return { score, hints };
  } catch (err) {
    logger.warn('Failed to calculate inventory score:', err);
    return { score: 0, hints: [] };
  }
}

// ── Budget ───────────────────────────────────────────────────────────────────

function calcBudgetScore(db: BetterSqlite3.Database): PillarResult {
  try {
    const categoryCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM budget_categories').get() as { cnt: number }
    ).cnt;

    if (categoryCount === 0) {
      return {
        score: 0,
        hints: ['Set up budget categories to improve your Budget score'],
      };
    }

    const totalBudget = (
      db
        .prepare('SELECT COALESCE(SUM(budgetedAmount), 0) as total FROM budget_categories')
        .get() as { total: number }
    ).total;

    if (totalBudget <= 0) {
      return {
        score: 0,
        hints: ['Set budget amounts for your categories to track adherence'],
      };
    }

    const hints: string[] = [];

    // Helper: get spending ratio for a given YYYY-MM month string
    const getMonthRatio = (month: string): number => {
      const spending = (
        db
          .prepare(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date LIKE ?`
          )
          .get(`${month}%`) as { total: number }
      ).total;
      return spending / totalBudget;
    };

    // Current month status (0-10)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentRatio = getMonthRatio(currentMonth);

    let currentMonthPts: number;
    if (currentRatio < 1.0) {
      currentMonthPts = 10; // under budget
    } else if (currentRatio < 1.01) {
      currentMonthPts = 7; // at budget (within 1%)
    } else if (currentRatio <= 1.1) {
      currentMonthPts = 4; // 1-10% over
    } else {
      currentMonthPts = 0; // 10%+ over
    }

    if (currentMonthPts < 10) {
      const overByRatio = currentRatio - 1.0;
      const pct = Math.round(overByRatio * 100);
      if (pct > 0) {
        hints.push(
          `Spending is ${pct}% over budget this month — reduce expenses to earn more points`
        );
      }
    }

    // 3-month trend (0-10) — compare ratios of last 3 months
    const months: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    const ratios = months.map(getMonthRatio);

    // ratios[0] = current, ratios[1] = last month, ratios[2] = 2 months ago
    // "improving" means current ratio is lower than prior months (spending less relative to budget)
    let trendPts = 7; // default: steady
    if (ratios[0] !== undefined && ratios[1] !== undefined && ratios[2] !== undefined) {
      const improving = ratios[0] < ratios[1] && ratios[1] <= ratios[2];
      const declining = ratios[0] > ratios[1] && ratios[1] >= ratios[2];
      if (improving) trendPts = 10;
      else if (declining) trendPts = 3;
    }

    // Budget streak bonus (0-5): +1 per consecutive month under budget (max 5)
    const profileRow = db.prepare('SELECT streaks FROM gamification_profile WHERE id = 1').get() as
      | { streaks: string }
      | undefined;

    let streakBonus = 0;
    if (profileRow) {
      const streaks = JSON.parse(profileRow.streaks) as {
        budget?: { current: number };
      };
      streakBonus = Math.min(5, streaks.budget?.current ?? 0);
    }

    const score = Math.min(25, currentMonthPts + trendPts + streakBonus);
    return { score, hints };
  } catch (err) {
    logger.warn('Failed to calculate budget score:', err);
    return { score: 0, hints: [] };
  }
}

// ── Systems ──────────────────────────────────────────────────────────────────

function calcSystemsScore(
  db: BetterSqlite3.Database,
  sensorRegistry?: SensorRegistryLike
): PillarResult {
  try {
    const hints: string[] = [];
    const allSensors = sensorRegistry?.getAll() ?? [];
    const totalSensors = allSensors.length;

    // Active sensor ratio (0-15 pts)
    let activeSensorRatioPts = 0;
    if (totalSensors > 0) {
      const activeSensors = allSensors.filter((s) => s.state === 'active').length;
      activeSensorRatioPts = Math.round(15 * (activeSensors / totalSensors));

      const inactive = totalSensors - activeSensors;
      if (inactive > 0) {
        hints.push(
          `${inactive} sensor${inactive > 1 ? 's are' : ' is'} offline or stale — check sensor connectivity`
        );
      }
    } else {
      hints.push('Register IoT sensors to improve your Systems score');
    }

    // Sensor count (0-5 pts)
    let sensorCountPts: number;
    if (totalSensors === 0) sensorCountPts = 0;
    else if (totalSensors <= 3) sensorCountPts = 2;
    else if (totalSensors <= 7) sensorCountPts = 4;
    else sensorCountPts = 5;

    // Vault usage (0-5 pts)
    const vaultCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM vault_entries').get() as { cnt: number }
    ).cnt;
    const vaultPts = vaultCount > 0 ? 5 : 0;

    if (vaultCount === 0) {
      hints.push('Store important credentials in the vault to earn 5 points');
    }

    const score = Math.min(25, activeSensorRatioPts + sensorCountPts + vaultPts);
    return { score, hints };
  } catch (err) {
    logger.warn('Failed to calculate systems score:', err);
    return { score: 0, hints: [] };
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Calculate the full home health score from all 4 pillars.
 * Returns the score with pillarHints from the lowest-scoring pillars.
 */
export function calculateHomeHealthScore({ db, sensorRegistry }: ScoreInputs): HomeHealthScore {
  const maintenanceResult = calcMaintenanceScore(db);
  const inventoryResult = calcInventoryScore(db);
  const budgetResult = calcBudgetScore(db);
  const systemsResult = calcSystemsScore(db, sensorRegistry);

  const total =
    maintenanceResult.score + inventoryResult.score + budgetResult.score + systemsResult.score;

  // Surface hints from the lowest-scoring pillars (up to 3 total hints)
  const pillarScores = [
    { score: maintenanceResult.score, hints: maintenanceResult.hints },
    { score: inventoryResult.score, hints: inventoryResult.hints },
    { score: budgetResult.score, hints: budgetResult.hints },
    { score: systemsResult.score, hints: systemsResult.hints },
  ].sort((a, b) => a.score - b.score);

  const pillarHints: string[] = [];
  for (const pillar of pillarScores) {
    for (const hint of pillar.hints) {
      if (pillarHints.length >= 3) break;
      pillarHints.push(hint);
    }
    if (pillarHints.length >= 3) break;
  }

  return {
    total,
    maintenance: maintenanceResult.score,
    inventory: inventoryResult.score,
    budget: budgetResult.score,
    systems: systemsResult.score,
    calculatedAt: new Date().toISOString(),
    pillarHints,
  };
}
