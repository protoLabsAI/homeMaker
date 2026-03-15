/**
 * Vendor React hooks
 *
 * Fetches vendors from the backend API using the same apiFetch pattern
 * as the rest of the codebase. Provides CRUD mutations that refetch the
 * vendor list on success.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiFetch } from '@/lib/api-fetch';
import type { Vendor, CreateVendorInput, UpdateVendorInput } from '@protolabsai/types';

interface VendorListResponse {
  success: boolean;
  data: Vendor[];
  error?: string;
}

interface VendorMutationResponse {
  success: boolean;
  data?: Vendor;
  error?: string;
}

interface VendorDeleteResponse {
  success: boolean;
  error?: string;
}

interface UseVendorsResult {
  vendors: Vendor[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refetch: () => void;
  createVendor: (input: CreateVendorInput) => Promise<Vendor | null>;
  updateVendor: (id: string, updates: UpdateVendorInput) => Promise<Vendor | null>;
  deleteVendor: (id: string) => Promise<boolean>;
}

/**
 * Fetch all vendors and provide CRUD mutations.
 */
export function useVendors(): UseVendorsResult {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchVendors = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiGet<VendorListResponse>('/api/vendors');

      if (fetchId !== fetchIdRef.current) return;

      if (result.success) {
        setVendors(result.data);
      } else {
        setError(result.error ?? 'Failed to fetch vendors');
        setVendors([]);
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
      setVendors([]);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const createVendor = useCallback(
    async (input: CreateVendorInput): Promise<Vendor | null> => {
      setIsMutating(true);
      try {
        const result = await apiPost<VendorMutationResponse>('/api/vendors', input);
        if (result.success && result.data) {
          await fetchVendors();
          return result.data;
        }
        throw new Error(result.error ?? 'Failed to create vendor');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchVendors]
  );

  const updateVendor = useCallback(
    async (id: string, updates: UpdateVendorInput): Promise<Vendor | null> => {
      setIsMutating(true);
      try {
        const response = await apiFetch(`/api/vendors/${id}`, 'PATCH', { body: updates });
        const result: VendorMutationResponse = await response.json();
        if (result.success && result.data) {
          await fetchVendors();
          return result.data;
        }
        throw new Error(result.error ?? 'Failed to update vendor');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchVendors]
  );

  const deleteVendor = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true);
      try {
        const response = await apiFetch(`/api/vendors/${id}`, 'DELETE');
        const result: VendorDeleteResponse = await response.json();
        if (result.success) {
          await fetchVendors();
          return true;
        }
        throw new Error(result.error ?? 'Failed to delete vendor');
      } finally {
        setIsMutating(false);
      }
    },
    [fetchVendors]
  );

  return {
    vendors,
    isLoading,
    isMutating,
    error,
    refetch: fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
  };
}
