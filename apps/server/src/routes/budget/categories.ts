/**
 * Budget Category Routes
 *
 * - POST /budget/categories     — create a new category
 * - GET  /budget/categories     — list all categories
 * - DELETE /budget/categories/:id — delete a category
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { BudgetService } from '../../services/budget-service.js';
import type { EventEmitter } from '../../lib/events.js';

const logger = createLogger('BudgetCategoryRoutes');

export function createBudgetCategoryRoutes(
  budgetService: BudgetService,
  events?: EventEmitter
): Router {
  const router = Router();

  /** POST /budget/categories */
  router.post('/', (req, res) => {
    try {
      const { name, color, budgetedAmount } = req.body as {
        name?: string;
        color?: string;
        budgetedAmount?: number;
      };

      if (!name || typeof name !== 'string' || !name.trim()) {
        res
          .status(400)
          .json({ success: false, error: 'name is required and must be a non-empty string' });
        return;
      }

      if (!color || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        res.status(400).json({
          success: false,
          error: 'color is required and must be a valid hex color (e.g. #4CAF50)',
        });
        return;
      }

      if (
        budgetedAmount !== undefined &&
        (typeof budgetedAmount !== 'number' || budgetedAmount < 0)
      ) {
        res
          .status(400)
          .json({ success: false, error: 'budgetedAmount must be a non-negative number' });
        return;
      }

      const category = budgetService.createCategory(name.trim(), color, budgetedAmount);
      events?.emit('budget:category-created', { categoryId: category.id });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      logger.error('Failed to create budget category:', error);
      res.status(500).json({ success: false, error: 'Failed to create budget category' });
    }
  });

  /** GET /budget/categories */
  router.get('/', (_req, res) => {
    try {
      const categories = budgetService.listCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      logger.error('Failed to list budget categories:', error);
      res.status(500).json({ success: false, error: 'Failed to list budget categories' });
    }
  });

  /** DELETE /budget/categories/:id */
  router.delete('/:id', (req, res) => {
    try {
      budgetService.deleteCategory(req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to delete budget category:', error);
      res.status(500).json({ success: false, error: 'Failed to delete budget category' });
    }
  });

  return router;
}
