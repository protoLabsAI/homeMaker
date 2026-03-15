/**
 * Budget Routes — aggregate router for all budget endpoints.
 *
 * Mounts category, transaction, and summary sub-routers under the /budget prefix.
 */

import { Router } from 'express';
import type { BudgetService } from '../../services/budget-service.js';
import type { EventEmitter } from '../../lib/events.js';
import { createBudgetCategoryRoutes } from './categories.js';
import { createBudgetTransactionRoutes } from './transactions.js';
import { createBudgetSummaryRoutes } from './summary.js';

export function createBudgetRoutes(budgetService: BudgetService, events?: EventEmitter): Router {
  const router = Router();

  router.use('/categories', createBudgetCategoryRoutes(budgetService, events));
  router.use('/transactions', createBudgetTransactionRoutes(budgetService, events));
  router.use('/summary', createBudgetSummaryRoutes(budgetService));

  return router;
}
