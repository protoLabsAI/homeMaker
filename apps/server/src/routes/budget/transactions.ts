/**
 * Budget Transaction Routes
 *
 * - POST   /budget/transactions     — create a new transaction
 * - GET    /budget/transactions     — list transactions (query: month, categoryId, type)
 * - DELETE /budget/transactions/:id — delete a transaction
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { TransactionRecurrence } from '@protolabsai/types';
import type { BudgetService } from '../../services/budget-service.js';
import type { EventEmitter } from '../../lib/events.js';

const logger = createLogger('BudgetTransactionRoutes');

const VALID_TYPES = new Set(['income', 'expense']);
const VALID_RECURRENCES = new Set(['weekly', 'monthly', 'yearly']);

export function createBudgetTransactionRoutes(
  budgetService: BudgetService,
  events?: EventEmitter
): Router {
  const router = Router();

  /** POST /budget/transactions */
  router.post('/', (req, res) => {
    try {
      const { type, amount, categoryId, description, date, recurrence } = req.body as {
        type?: string;
        amount?: number;
        categoryId?: string;
        description?: string;
        date?: string;
        recurrence?: string | null;
      };

      if (!type || !VALID_TYPES.has(type)) {
        res.status(400).json({ success: false, error: 'type must be "income" or "expense"' });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        res
          .status(400)
          .json({ success: false, error: 'amount must be a positive integer (cents)' });
        return;
      }

      if (!categoryId || typeof categoryId !== 'string') {
        res.status(400).json({ success: false, error: 'categoryId is required' });
        return;
      }

      if (!description || typeof description !== 'string' || !description.trim()) {
        res.status(400).json({
          success: false,
          error: 'description is required and must be a non-empty string',
        });
        return;
      }

      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ success: false, error: 'date is required in YYYY-MM-DD format' });
        return;
      }

      if (recurrence !== undefined && recurrence !== null && !VALID_RECURRENCES.has(recurrence)) {
        res.status(400).json({
          success: false,
          error: 'recurrence must be "weekly", "monthly", "yearly", or null',
        });
        return;
      }

      const transaction = budgetService.createTransaction(
        type as 'income' | 'expense',
        amount,
        categoryId,
        description.trim(),
        date,
        (recurrence as TransactionRecurrence) ?? null
      );

      events?.emit('budget:transaction-created', { transactionId: transaction.id });

      // Detect month boundary: if this is the first transaction of a new month,
      // close out the previous month and evaluate whether it was under budget.
      if (events) {
        const thisMonth = transaction.date.slice(0, 7);
        const allTransactions = budgetService.listTransactions();
        const transactionsThisMonth = allTransactions.filter((t) => t.date.startsWith(thisMonth));

        if (transactionsThisMonth.length === 1) {
          const prevMonths = [
            ...new Set(
              allTransactions
                .filter((t) => t.date.slice(0, 7) < thisMonth)
                .map((t) => t.date.slice(0, 7))
            ),
          ].sort();

          if (prevMonths.length > 0) {
            const prevMonth = prevMonths[prevMonths.length - 1];
            const prevSummary = budgetService.getSummary(prevMonth);
            events.emit('budget:month-closed', {
              month: prevMonth,
              underBudget: prevSummary.balance >= 0,
            });
          }
        }
      }

      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      logger.error('Failed to create transaction:', error);
      res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
  });

  /** GET /budget/transactions?month=YYYY-MM&categoryId=...&type=income|expense */
  router.get('/', (req, res) => {
    try {
      const month = typeof req.query.month === 'string' ? req.query.month : undefined;
      const categoryId =
        typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
      const typeParam = typeof req.query.type === 'string' ? req.query.type : undefined;

      if (typeParam && !VALID_TYPES.has(typeParam)) {
        res.status(400).json({ success: false, error: 'type must be "income" or "expense"' });
        return;
      }

      const transactions = budgetService.listTransactions({
        month,
        categoryId,
        type: typeParam as 'income' | 'expense' | undefined,
      });
      res.json({ success: true, data: transactions });
    } catch (error) {
      logger.error('Failed to list transactions:', error);
      res.status(500).json({ success: false, error: 'Failed to list transactions' });
    }
  });

  /** DELETE /budget/transactions/:id */
  router.delete('/:id', (req, res) => {
    try {
      budgetService.deleteTransaction(req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to delete transaction:', error);
      res.status(500).json({ success: false, error: 'Failed to delete transaction' });
    }
  });

  return router;
}
