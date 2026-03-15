/**
 * BudgetService — SQLite-backed household budget tracking.
 *
 * Manages budget categories and transactions with monthly summaries.
 * Tables are created automatically on first instantiation. All monetary
 * amounts are stored in cents to avoid floating-point arithmetic issues.
 */

import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  BudgetCategory,
  Transaction,
  TransactionRecurrence,
  BudgetSummary,
  BudgetCategorySummary,
} from '@protolabsai/types';

const logger = createLogger('BudgetService');

/** Filters for querying transactions */
export interface TransactionFilters {
  /** YYYY-MM prefix to match against date */
  month?: string;
  /** Only transactions in this category */
  categoryId?: string;
  /** Only income or only expense */
  type?: 'income' | 'expense';
}

export class BudgetService {
  private db: BetterSqlite3.Database;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, 'budget.db');
    logger.info(`Opening budget database at ${dbPath}`);

    this.db = new BetterSqlite3.default(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
  }

  /** Create schema if it does not already exist */
  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS budget_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        budgetedAmount INTEGER
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount INTEGER NOT NULL,
        categoryId TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        recurrence TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES budget_categories(id)
      );
    `);
    logger.info('Budget tables initialized');
  }

  // ── Categories ────────────────────────────────────────────────────────────

  createCategory(name: string, color: string, budgetedAmount?: number): BudgetCategory {
    const id = randomUUID();
    const stmt = this.db.prepare(
      'INSERT INTO budget_categories (id, name, color, budgetedAmount) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, name, color, budgetedAmount ?? null);
    logger.info(`Category created: "${name}" (${id})`);
    return { id, name, color, budgetedAmount };
  }

  listCategories(): BudgetCategory[] {
    const rows = this.db
      .prepare('SELECT id, name, color, budgetedAmount FROM budget_categories ORDER BY name')
      .all() as Array<{ id: string; name: string; color: string; budgetedAmount: number | null }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      ...(row.budgetedAmount != null ? { budgetedAmount: row.budgetedAmount } : {}),
    }));
  }

  deleteCategory(id: string): void {
    const result = this.db.prepare('DELETE FROM budget_categories WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Category "${id}" not found`);
    }
    logger.info(`Category deleted: ${id}`);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  createTransaction(
    type: 'income' | 'expense',
    amount: number,
    categoryId: string,
    description: string,
    date: string,
    recurrence?: TransactionRecurrence | null
  ): Transaction {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(
      'INSERT INTO transactions (id, type, amount, categoryId, description, date, recurrence, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, type, amount, categoryId, description, date, recurrence ?? null, createdAt);
    logger.info(`Transaction created: ${type} ${amount}c in category ${categoryId} (${id})`);

    return {
      id,
      type,
      amount,
      categoryId,
      description,
      date,
      recurrence: recurrence ?? null,
      createdAt,
    };
  }

  listTransactions(filters?: TransactionFilters): Transaction[] {
    const conditions: string[] = [];
    const params: Array<string> = [];

    if (filters?.month) {
      conditions.push("date LIKE ? || '%'");
      params.push(filters.month);
    }
    if (filters?.categoryId) {
      conditions.push('categoryId = ?');
      params.push(filters.categoryId);
    }
    if (filters?.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT id, type, amount, categoryId, description, date, recurrence, createdAt FROM transactions ${where} ORDER BY date DESC, createdAt DESC`;

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      type: 'income' | 'expense';
      amount: number;
      categoryId: string;
      description: string;
      date: string;
      recurrence: string | null;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      recurrence: (row.recurrence as TransactionRecurrence) ?? null,
    }));
  }

  deleteTransaction(id: string): void {
    const result = this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Transaction "${id}" not found`);
    }
    logger.info(`Transaction deleted: ${id}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  getSummary(month: string): BudgetSummary {
    // Total income for the month
    const incomeRow = this.db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date LIKE ? || '%'"
      )
      .get(month) as { total: number };

    // Total expenses for the month
    const expenseRow = this.db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date LIKE ? || '%'"
      )
      .get(month) as { total: number };

    const totalIncome = incomeRow.total;
    const totalExpenses = expenseRow.total;

    // Per-category expense breakdown
    const categoryRows = this.db
      .prepare(
        `SELECT t.categoryId, c.name as categoryName, SUM(t.amount) as total
         FROM transactions t
         JOIN budget_categories c ON t.categoryId = c.id
         WHERE t.type = 'expense' AND t.date LIKE ? || '%'
         GROUP BY t.categoryId
         ORDER BY total DESC`
      )
      .all(month) as Array<{ categoryId: string; categoryName: string; total: number }>;

    const byCategory: BudgetCategorySummary[] = categoryRows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      total: row.total,
    }));

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      byCategory,
    };
  }

  /** Close the database connection (for clean shutdown) */
  close(): void {
    this.db.close();
    logger.info('Budget database closed');
  }
}
