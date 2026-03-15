/**
 * Budget data hooks
 *
 * Provides data fetching and mutations for the budget view.
 * All amounts are in cents.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api-fetch';
import type {
  BudgetCategory,
  Transaction,
  BudgetSummary,
  TransactionRecurrence,
} from '@protolabsai/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateTransactionInput {
  type: 'income' | 'expense';
  /** Amount in cents */
  amount: number;
  categoryId: string;
  description: string;
  date: string;
  recurrence: TransactionRecurrence | null;
}

export interface UseBudgetResult {
  transactions: Transaction[];
  categories: BudgetCategory[];
  summary: BudgetSummary | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refetch: () => void;
  createTransaction: (input: CreateTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

/** Format a Date to YYYY-MM month string */
export function toMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function useBudget(month: string): UseBudgetResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const fetchId = ++fetchCountRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [txRes, catRes, sumRes] = await Promise.all([
        apiGet<ApiResponse<Transaction[]>>(
          `/api/budget/transactions?month=${encodeURIComponent(month)}`
        ),
        apiGet<ApiResponse<BudgetCategory[]>>('/api/budget/categories'),
        apiGet<ApiResponse<BudgetSummary>>(
          `/api/budget/summary?month=${encodeURIComponent(month)}`
        ),
      ]);

      if (fetchId !== fetchCountRef.current) return;

      if (!txRes.success) throw new Error(txRes.error ?? 'Failed to load transactions');
      if (!catRes.success) throw new Error(catRes.error ?? 'Failed to load categories');
      if (!sumRes.success) throw new Error(sumRes.error ?? 'Failed to load summary');

      setTransactions(txRes.data ?? []);
      setCategories(catRes.data ?? []);
      setSummary(sumRes.data ?? null);
    } catch (err) {
      if (fetchId !== fetchCountRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load budget data');
    } finally {
      if (fetchId === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, [month]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      setIsMutating(true);
      try {
        const res = await apiPost<ApiResponse<Transaction>>('/api/budget/transactions', input);
        if (!res.success) throw new Error(res.error ?? 'Failed to create transaction');
        await fetchAll();
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAll]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
        const res = await apiDelete<ApiResponse<{ id: string }>>(
          `/api/budget/transactions/${encodeURIComponent(id)}`
        );
        if (!res.success) throw new Error(res.error ?? 'Failed to delete transaction');
        await fetchAll();
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAll]
  );

  return {
    transactions,
    categories,
    summary,
    isLoading,
    isMutating,
    error,
    refetch: fetchAll,
    createTransaction,
    deleteTransaction,
  };
}
