/**
 * Home Health Score calculator.
 *
 * Computes a 0-100 score from 4 equal pillars (each 0-25):
 *   - maintenance: based on overdue vs upcoming schedules
 *   - inventory:   based on documented assets and warranty coverage
 *   - budget:      based on transaction history and budget adherence
 *   - systems:     based on registered sensors / IoT coverage
 */

import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type { HomeHealthScore } from '@protolabsai/types';

const logger = createLogger('HealthScoreCalculator');

interface ScoreInputs {
  db: BetterSqlite3.Database;
}

/**
 * Compute the maintenance pillar score (0-25).
 *
 * Scoring:
 *   - 25 pts if all schedules are up-to-date (no overdue)
 *   - Deducted proportionally per overdue schedule
 *   - 0 schedules → 15 pts (neutral — not great, not terrible)
 */
function calcMaintenanceScore(db: BetterSqlite3.Database): number {
  try {
    const now = new Date().toISOString();

    const total = (
      db.prepare('SELECT COUNT(*) as cnt FROM maintenance_schedules').get() as {
        cnt: number;
      }
    ).cnt;

    if (total === 0) return 15;

    const overdue = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM maintenance_schedules WHERE nextDueAt < ?')
        .get(now) as { cnt: number }
    ).cnt;

    const ratio = overdue / total;
    // 25 when ratio=0, 0 when ratio=1
    return Math.round(25 * (1 - ratio));
  } catch (err) {
    logger.warn('Failed to calculate maintenance score:', err);
    return 0;
  }
}

/**
 * Compute the inventory pillar score (0-25).
 *
 * Scoring:
 *   - Base: +15 pts if ≥1 asset documented
 *   - Photo/manual coverage: up to +5 pts (% of assets with manualUrl)
 *   - Active warranties: up to +5 pts (% of assets with non-expired warranty)
 *   - 0 assets → 0 pts
 */
function calcInventoryScore(db: BetterSqlite3.Database): number {
  try {
    const total = (db.prepare('SELECT COUNT(*) as cnt FROM assets').get() as { cnt: number }).cnt;

    if (total === 0) return 0;

    const withManual = (
      db.prepare('SELECT COUNT(*) as cnt FROM assets WHERE manualUrl IS NOT NULL').get() as {
        cnt: number;
      }
    ).cnt;

    const now = new Date().toISOString();
    const withValidWarranty = (
      db
        .prepare(
          'SELECT COUNT(*) as cnt FROM assets WHERE warrantyExpiration IS NOT NULL AND warrantyExpiration > ?'
        )
        .get(now) as { cnt: number }
    ).cnt;

    const base = 15;
    const manualPts = Math.round(5 * (withManual / total));
    const warrantyPts = Math.round(5 * (withValidWarranty / total));

    return Math.min(25, base + manualPts + warrantyPts);
  } catch (err) {
    logger.warn('Failed to calculate inventory score:', err);
    return 0;
  }
}

/**
 * Compute the budget pillar score (0-25).
 *
 * Scoring:
 *   - Checks last 30 days of transactions vs budgeted amounts
 *   - 25 pts: has transactions AND spending within budget
 *   - 15 pts: has transactions but no budgeted categories to compare
 *   - 10 pts: no transactions in last 30 days
 *   - 0 pts: no categories at all
 */
function calcBudgetScore(db: BetterSqlite3.Database): number {
  try {
    const categoryCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM budget_categories').get() as { cnt: number }
    ).cnt;

    if (categoryCount === 0) return 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const recentTxCount = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM transactions WHERE type = 'expense' AND date >= ?")
        .get(thirtyDaysAgo) as { cnt: number }
    ).cnt;

    if (recentTxCount === 0) return 10;

    // Check if total recent spending is within total budgeted amount
    const totalBudgeted = (
      db
        .prepare('SELECT COALESCE(SUM(budgetedAmount), 0) as total FROM budget_categories')
        .get() as { total: number }
    ).total;

    if (totalBudgeted <= 0) return 15;

    const totalSpent = (
      db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?"
        )
        .get(thirtyDaysAgo) as { total: number }
    ).total;

    // Budget adherence ratio — 1.0 means exactly on budget, <1.0 is under budget
    const adherenceRatio = totalSpent / totalBudgeted;

    if (adherenceRatio <= 1.0) {
      return 25;
    } else if (adherenceRatio <= 1.1) {
      return 20;
    } else if (adherenceRatio <= 1.25) {
      return 15;
    } else {
      return 10;
    }
  } catch (err) {
    logger.warn('Failed to calculate budget score:', err);
    return 0;
  }
}

/**
 * Compute the systems pillar score (0-25).
 *
 * Scoring based on active sensor count:
 *   - 0 sensors: 5 pts (base — at least server is running)
 *   - 1-2 sensors: 10 pts
 *   - 3-5 sensors: 18 pts
 *   - 6+ sensors: 25 pts
 */
function calcSystemsScore(db: BetterSqlite3.Database): number {
  try {
    const sensorCount = (
      db.prepare('SELECT COUNT(DISTINCT sensorId) as cnt FROM sensor_readings').get() as {
        cnt: number;
      }
    ).cnt;

    if (sensorCount === 0) return 5;
    if (sensorCount <= 2) return 10;
    if (sensorCount <= 5) return 18;
    return 25;
  } catch (err) {
    logger.warn('Failed to calculate systems score:', err);
    return 5;
  }
}

/**
 * Calculate the full home health score from all 4 pillars.
 */
export function calculateHomeHealthScore({ db }: ScoreInputs): HomeHealthScore {
  const maintenance = calcMaintenanceScore(db);
  const inventory = calcInventoryScore(db);
  const budget = calcBudgetScore(db);
  const systems = calcSystemsScore(db);

  const total = maintenance + inventory + budget + systems;

  return {
    total,
    maintenance,
    inventory,
    budget,
    systems,
    calculatedAt: new Date().toISOString(),
  };
}
