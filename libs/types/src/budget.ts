/**
 * Budget tracking types for homeMaker household budget management.
 *
 * Categories organize spending/income, and transactions record individual
 * monetary events. Amounts are stored in cents to avoid floating-point issues.
 */

/** A spending or income category with an optional monthly budget target */
export interface BudgetCategory {
  /** Unique identifier */
  id: string;
  /** Human-readable category name (e.g. "Groceries", "Utilities") */
  name: string;
  /** Hex color for UI display (e.g. "#4CAF50") */
  color: string;
  /** Optional monthly budget target in cents */
  budgetedAmount?: number;
}

/** Recurrence interval for repeating transactions */
export type TransactionRecurrence = 'weekly' | 'monthly' | 'yearly';

/** A single income or expense transaction */
export interface Transaction {
  /** Unique identifier */
  id: string;
  /** Whether this is income or an expense */
  type: 'income' | 'expense';
  /** Amount in cents (always positive) */
  amount: number;
  /** Category this transaction belongs to */
  categoryId: string;
  /** Free-form description */
  description: string;
  /** Date of the transaction in YYYY-MM-DD format */
  date: string;
  /** Recurrence interval, or null for one-time transactions */
  recurrence: TransactionRecurrence | null;
  /** ISO-8601 timestamp of when this transaction was created */
  createdAt: string;
}

/** Monthly budget summary with per-category breakdowns */
export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: BudgetCategorySummary[];
}

/** Per-category total for a given month */
export interface BudgetCategorySummary {
  categoryId: string;
  categoryName: string;
  total: number;
}
