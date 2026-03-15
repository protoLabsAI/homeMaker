/**
 * Vault data hooks
 *
 * Provides data fetching and mutations for the vault view.
 * Uses the same apiGet/apiPost/apiDelete pattern as budget hooks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api-fetch';
import type { VaultEntry, VaultEntryWithValue, SecretCategory } from '@protolabsai/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiListResponse<T> extends ApiResponse<T[]> {
  total?: number;
}

export interface CreateVaultEntryInput {
  name: string;
  value: string;
  category: SecretCategory;
  tags: string[];
  username?: string;
  url?: string;
  notes?: string;
}

export interface UseVaultResult {
  entries: VaultEntry[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refetch: () => void;
  createEntry: (input: CreateVaultEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  fetchDecryptedValue: (id: string) => Promise<string>;
  searchEntries: (query: string) => Promise<VaultEntry[]>;
}

export function useVault(): UseVaultResult {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const fetchId = ++fetchCountRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiGet<ApiListResponse<VaultEntry>>('/api/vault');

      if (fetchId !== fetchCountRef.current) return;

      if (!res.success) throw new Error(res.error ?? 'Failed to load vault entries');

      setEntries(res.data ?? []);
    } catch (err) {
      if (fetchId !== fetchCountRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load vault entries');
    } finally {
      if (fetchId === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createEntry = useCallback(
    async (input: CreateVaultEntryInput) => {
      setIsMutating(true);
      try {
        const res = await apiPost<ApiResponse<VaultEntry>>('/api/vault', input);
        if (!res.success) throw new Error(res.error ?? 'Failed to create vault entry');
        await fetchAll();
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAll]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
        const res = await apiDelete<ApiResponse<{ id: string }>>(
          `/api/vault/${encodeURIComponent(id)}`
        );
        if (!res.success) throw new Error(res.error ?? 'Failed to delete vault entry');
        await fetchAll();
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAll]
  );

  const fetchDecryptedValue = useCallback(async (id: string): Promise<string> => {
    const res = await apiGet<ApiResponse<VaultEntryWithValue>>(
      `/api/vault/${encodeURIComponent(id)}`
    );
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Failed to decrypt vault entry');
    }
    return res.data.value;
  }, []);

  const searchEntries = useCallback(async (query: string): Promise<VaultEntry[]> => {
    const res = await apiGet<ApiListResponse<VaultEntry>>(
      `/api/vault/search?q=${encodeURIComponent(query)}`
    );
    if (!res.success) throw new Error(res.error ?? 'Failed to search vault entries');
    return res.data ?? [];
  }, []);

  return {
    entries,
    isLoading,
    isMutating,
    error,
    refetch: fetchAll,
    createEntry,
    deleteEntry,
    fetchDecryptedValue,
    searchEntries,
  };
}
