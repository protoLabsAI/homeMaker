/**
 * Inventory React Query hooks
 *
 * Fetches assets from the backend API using the same apiFetch pattern
 * as the rest of the codebase. Provides CRUD mutations that invalidate
 * the asset list on success.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiFetch } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { Asset, CreateAssetInput, UpdateAssetInput, WarrantyReport } from '@protolabsai/types';
import type { EventType } from '@protolabsai/types';

interface AssetListResponse {
  success: boolean;
  data: Asset[];
  error?: string;
}

interface AssetMutationResponse {
  success: boolean;
  data?: Asset;
  error?: string;
}

interface AssetDeleteResponse {
  success: boolean;
  error?: string;
}

interface WarrantyReportResponse {
  success: boolean;
  data: WarrantyReport;
  error?: string;
}

/** WebSocket event types that should trigger an inventory refetch */
const INVENTORY_WS_EVENT_TYPES: EventType[] = [
  'inventory:asset:created',
  'inventory:asset:updated',
  'inventory:asset:deleted',
];

interface UseInventoryResult {
  assets: Asset[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  warrantyReport: WarrantyReport | null;
  refetch: () => void;
  createAsset: (input: CreateAssetInput) => Promise<Asset | null>;
  updateAsset: (id: string, updates: UpdateAssetInput) => Promise<Asset | null>;
  deleteAsset: (id: string) => Promise<boolean>;
}

/**
 * Fetch all inventory assets and provide CRUD mutations.
 * Subscribes to WebSocket events for real-time updates.
 */
export function useInventory(): UseInventoryResult {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [warrantyReport, setWarrantyReport] = useState<WarrantyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchAssets = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [assetsResult, warrantyResult] = await Promise.all([
        apiGet<AssetListResponse>('/api/inventory'),
        apiGet<WarrantyReportResponse>('/api/inventory/warranty-report'),
      ]);

      if (fetchId !== fetchIdRef.current) return;

      if (assetsResult.success) {
        setAssets(assetsResult.data);
      } else {
        setError(assetsResult.error ?? 'Failed to fetch assets');
        setAssets([]);
      }

      if (warrantyResult.success) {
        setWarrantyReport(warrantyResult.data);
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
      setAssets([]);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  // Subscribe to WebSocket events to keep the view in sync
  useEffect(() => {
    const api = getHttpApiClient();

    const unsubscribe = api.subscribeToEvents((type: EventType) => {
      if (!INVENTORY_WS_EVENT_TYPES.includes(type)) return;
      void fetchAssets();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchAssets]);

  const createAsset = useCallback(
    async (input: CreateAssetInput): Promise<Asset | null> => {
      setIsMutating(true);
      try {
        const result = await apiPost<AssetMutationResponse>('/api/inventory', input);
        if (result.success && result.data) {
          await fetchAssets();
          return result.data;
        }
        throw new Error(result.error ?? 'Failed to create asset');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAssets]
  );

  const updateAsset = useCallback(
    async (id: string, updates: UpdateAssetInput): Promise<Asset | null> => {
      setIsMutating(true);
      try {
        const response = await apiFetch(`/api/inventory/${id}`, 'PATCH', { body: updates });
        const result: AssetMutationResponse = await response.json();
        if (result.success && result.data) {
          await fetchAssets();
          return result.data;
        }
        throw new Error(result.error ?? 'Failed to update asset');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAssets]
  );

  const deleteAsset = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true);
      try {
        const response = await apiFetch(`/api/inventory/${id}`, 'DELETE');
        const result: AssetDeleteResponse = await response.json();
        if (result.success) {
          await fetchAssets();
          return true;
        }
        throw new Error(result.error ?? 'Failed to delete asset');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAssets]
  );

  return {
    assets,
    isLoading,
    isMutating,
    error,
    warrantyReport,
    refetch: fetchAssets,
    createAsset,
    updateAsset,
    deleteAsset,
  };
}
