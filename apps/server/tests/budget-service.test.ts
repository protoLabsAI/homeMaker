/**
 * Unit tests for BudgetService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BudgetService } from '../src/services/budget-service.js';

describe('BudgetService', () => {
  let dataDir: string;
  let service: BudgetService;

  beforeEach(() => {
    // Create a unique temp directory for each test to ensure isolation
    dataDir = mkdtempSync(join(tmpdir(), 'budget-test-'));
    service = new BudgetService(dataDir);
  });

  afterEach(() => {
    service.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  // ── createCategory ────────────────────────────────────────────────────────

  it('creates a category with name and color', () => {
    const cat = service.createCategory('Groceries', '#4CAF50');
    expect(cat.id).toBeTruthy();
    expect(cat.name).toBe('Groceries');
    expect(cat.color).toBe('#4CAF50');
    expect(cat.budgetedAmount).toBeUndefined();
  });

  it('creates a category with budgetedAmount', () => {
    const cat = service.createCategory('Dining Out', '#FF9800', 50000); // $500 in cents
    expect(cat.budgetedAmount).toBe(50000);
  });

  // ── listCategories ────────────────────────────────────────────────────────

  it('returns empty array when no categories exist', () => {
    expect(service.listCategories()).toHaveLength(0);
  });

  it('lists categories ordered by name', () => {
    service.createCategory('Utilities', '#2196F3');
    service.createCategory('Groceries', '#4CAF50');
    service.createCategory('Rent', '#F44336');

    const list = service.listCategories();
    expect(list).toHaveLength(3);
    expect(list[0]?.name).toBe('Groceries');
    expect(list[1]?.name).toBe('Rent');
    expect(list[2]?.name).toBe('Utilities');
  });

  it('omits budgetedAmount when null', () => {
    service.createCategory('Misc', '#9E9E9E');
    const list = service.listCategories();
    expect(list[0]).not.toHaveProperty('budgetedAmount');
  });

  // ── deleteCategory ────────────────────────────────────────────────────────

  it('deletes a category by id', () => {
    const cat = service.createCategory('Temp', '#000000');
    service.deleteCategory(cat.id);
    const list = service.listCategories();
    expect(list).toHaveLength(0);
  });

  it('throws when deleting non-existent category', () => {
    expect(() => service.deleteCategory('ghost-id')).toThrow(/not found/);
  });

  // ── createTransaction ─────────────────────────────────────────────────────

  it('creates an income transaction', () => {
    const cat = service.createCategory('Salary', '#2196F3');
    const tx = service.createTransaction('income', 300000, cat.id, 'Monthly salary', '2025-01-01');

    expect(tx.id).toBeTruthy();
    expect(tx.type).toBe('income');
    expect(tx.amount).toBe(300000);
    expect(tx.categoryId).toBe(cat.id);
    expect(tx.description).toBe('Monthly salary');
    expect(tx.date).toBe('2025-01-01');
    expect(tx.recurrence).toBeNull();
    expect(tx.createdAt).toBeTruthy();
  });

  it('creates an expense transaction', () => {
    const cat = service.createCategory('Groceries', '#4CAF50');
    const tx = service.createTransaction('expense', 8500, cat.id, 'Weekly groceries', '2025-01-05');

    expect(tx.type).toBe('expense');
    expect(tx.amount).toBe(8500);
  });

  it('creates a recurring transaction', () => {
    const cat = service.createCategory('Rent', '#F44336');
    const tx = service.createTransaction(
      'expense',
      200000,
      cat.id,
      'Monthly rent',
      '2025-01-01',
      'monthly'
    );

    expect(tx.recurrence).toBe('monthly');
  });

  // ── listTransactions ──────────────────────────────────────────────────────

  it('returns empty array when no transactions', () => {
    expect(service.listTransactions()).toHaveLength(0);
  });

  it('lists all transactions ordered by date descending', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100, cat.id, 'Old', '2025-01-01');
    service.createTransaction('expense', 50, cat.id, 'New', '2025-01-15');

    const list = service.listTransactions();
    expect(list).toHaveLength(2);
    expect(list[0]?.date).toBe('2025-01-15'); // most recent first
    expect(list[1]?.date).toBe('2025-01-01');
  });

  it('filters transactions by month', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100, cat.id, 'Jan Tx', '2025-01-15');
    service.createTransaction('income', 200, cat.id, 'Feb Tx', '2025-02-01');
    service.createTransaction('expense', 50, cat.id, 'Jan Expense', '2025-01-20');

    const janOnly = service.listTransactions({ month: '2025-01' });
    expect(janOnly).toHaveLength(2);
    expect(janOnly.every((t) => t.date.startsWith('2025-01'))).toBe(true);
  });

  it('filters transactions by categoryId', () => {
    const groceries = service.createCategory('Groceries', '#4CAF50');
    const rent = service.createCategory('Rent', '#F44336');

    service.createTransaction('expense', 8500, groceries.id, 'Grocery run', '2025-01-05');
    service.createTransaction('expense', 200000, rent.id, 'Rent payment', '2025-01-01');

    const groceryTx = service.listTransactions({ categoryId: groceries.id });
    expect(groceryTx).toHaveLength(1);
    expect(groceryTx[0]?.categoryId).toBe(groceries.id);
  });

  it('filters transactions by type (income)', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100, cat.id, 'Salary', '2025-01-01');
    service.createTransaction('expense', 50, cat.id, 'Bill', '2025-01-02');

    const income = service.listTransactions({ type: 'income' });
    expect(income).toHaveLength(1);
    expect(income[0]?.type).toBe('income');
  });

  it('filters transactions by type (expense)', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100, cat.id, 'Salary', '2025-01-01');
    service.createTransaction('expense', 50, cat.id, 'Bill', '2025-01-02');

    const expenses = service.listTransactions({ type: 'expense' });
    expect(expenses).toHaveLength(1);
    expect(expenses[0]?.type).toBe('expense');
  });

  it('supports combined filters (month + type)', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100, cat.id, 'Jan Income', '2025-01-01');
    service.createTransaction('expense', 50, cat.id, 'Jan Expense', '2025-01-15');
    service.createTransaction('income', 200, cat.id, 'Feb Income', '2025-02-01');

    const result = service.listTransactions({ month: '2025-01', type: 'income' });
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe('Jan Income');
  });

  // ── deleteTransaction ─────────────────────────────────────────────────────

  it('deletes a transaction by id', () => {
    const cat = service.createCategory('Test', '#000');
    const tx = service.createTransaction('income', 100, cat.id, 'Deletable', '2025-01-01');

    service.deleteTransaction(tx.id);

    const list = service.listTransactions();
    expect(list).toHaveLength(0);
  });

  it('throws when deleting non-existent transaction', () => {
    expect(() => service.deleteTransaction('ghost-tx')).toThrow(/not found/);
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  it('returns zero totals for month with no transactions', () => {
    const summary = service.getSummary('2025-01');
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.balance).toBe(0);
    expect(summary.byCategory).toHaveLength(0);
  });

  it('calculates total income for a month', () => {
    const cat = service.createCategory('Salary', '#2196F3');
    service.createTransaction('income', 300000, cat.id, 'Salary', '2025-01-15');
    service.createTransaction('income', 50000, cat.id, 'Bonus', '2025-01-20');

    const summary = service.getSummary('2025-01');
    expect(summary.totalIncome).toBe(350000);
  });

  it('calculates total expenses for a month', () => {
    const cat = service.createCategory('Bills', '#F44336');
    service.createTransaction('expense', 120000, cat.id, 'Rent', '2025-01-01');
    service.createTransaction('expense', 8500, cat.id, 'Groceries', '2025-01-05');

    const summary = service.getSummary('2025-01');
    expect(summary.totalExpenses).toBe(128500);
  });

  it('computes correct balance (income - expenses)', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 300000, cat.id, 'Salary', '2025-01-15');
    service.createTransaction('expense', 120000, cat.id, 'Rent', '2025-01-01');

    const summary = service.getSummary('2025-01');
    expect(summary.balance).toBe(180000);
  });

  it('returns negative balance when expenses exceed income', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 50000, cat.id, 'Side gig', '2025-01-10');
    service.createTransaction('expense', 120000, cat.id, 'Rent', '2025-01-01');

    const summary = service.getSummary('2025-01');
    expect(summary.balance).toBe(-70000);
  });

  it('breaks down expenses by category', () => {
    const groceries = service.createCategory('Groceries', '#4CAF50');
    const utilities = service.createCategory('Utilities', '#2196F3');

    service.createTransaction('expense', 30000, groceries.id, 'Groceries week 1', '2025-01-05');
    service.createTransaction('expense', 25000, groceries.id, 'Groceries week 2', '2025-01-12');
    service.createTransaction('expense', 10000, utilities.id, 'Electric bill', '2025-01-08');

    const summary = service.getSummary('2025-01');
    expect(summary.byCategory).toHaveLength(2);

    const groceriesRow = summary.byCategory.find((c) => c.categoryName === 'Groceries');
    expect(groceriesRow?.total).toBe(55000);

    const utilitiesRow = summary.byCategory.find((c) => c.categoryName === 'Utilities');
    expect(utilitiesRow?.total).toBe(10000);
  });

  it('orders byCategory by total descending in summary', () => {
    const small = service.createCategory('Small', '#000');
    const large = service.createCategory('Large', '#fff');

    service.createTransaction('expense', 10000, small.id, 'Small expense', '2025-01-01');
    service.createTransaction('expense', 100000, large.id, 'Large expense', '2025-01-02');

    const summary = service.getSummary('2025-01');
    expect(summary.byCategory[0]?.categoryName).toBe('Large');
    expect(summary.byCategory[1]?.categoryName).toBe('Small');
  });

  it('does not include income transactions in byCategory breakdown', () => {
    const cat = service.createCategory('Mixed', '#000');
    service.createTransaction('income', 300000, cat.id, 'Income', '2025-01-01');
    service.createTransaction('expense', 50000, cat.id, 'Expense', '2025-01-02');

    const summary = service.getSummary('2025-01');
    // byCategory only shows expense rollups
    expect(summary.byCategory).toHaveLength(1);
    expect(summary.byCategory[0]?.total).toBe(50000);
  });

  it('isolates summary to the requested month', () => {
    const cat = service.createCategory('Test', '#000');
    service.createTransaction('income', 100000, cat.id, 'Jan Income', '2025-01-15');
    service.createTransaction('expense', 60000, cat.id, 'Jan Expense', '2025-01-20');
    service.createTransaction('income', 200000, cat.id, 'Feb Income', '2025-02-15');

    const janSummary = service.getSummary('2025-01');
    expect(janSummary.totalIncome).toBe(100000);
    expect(janSummary.totalExpenses).toBe(60000);

    const febSummary = service.getSummary('2025-02');
    expect(febSummary.totalIncome).toBe(200000);
    expect(febSummary.totalExpenses).toBe(0);
  });

  // ── close ─────────────────────────────────────────────────────────────────

  it('closes without error', () => {
    // close() is called in afterEach; calling it again should be benign
    // We just verify the afterEach doesn't throw — here we test close() itself
    expect(() => service.close()).not.toThrow();
  });
});
