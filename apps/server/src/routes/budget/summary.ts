/**
 * Budget Summary Route
 *
 * - GET /budget/summary?month=YYYY-MM — monthly income/expense summary with per-category breakdown
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { BudgetService } from '../../services/budget-service.js';

const logger = createLogger('BudgetSummaryRoutes');

export function createBudgetSummaryRoutes(budgetService: BudgetService): Router {
  const router = Router();

  /** GET /budget/summary?month=2026-03 */
  router.get('/', (req, res) => {
    try {
      const month = typeof req.query.month === 'string' ? req.query.month : undefined;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        res
          .status(400)
          .json({ success: false, error: 'month query parameter is required in YYYY-MM format' });
        return;
      }

      const summary = budgetService.getSummary(month);
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Failed to get budget summary:', error);
      res.status(500).json({ success: false, error: 'Failed to get budget summary' });
    }
  });

  return router;
}
