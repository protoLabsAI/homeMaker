import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiFetch, apiDelete } from '@/lib/api-fetch';
import type {
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  VendorCategory,
} from '@protolabsai/types';

// --- Query keys ---

const QUERY_KEYS = {
  vendors: ['vendors'] as const,
  vendor: (id: string) => ['vendors', id] as const,
  search: (q: string) => ['vendors', 'search', q] as const,
};

// --- API response types ---

interface VendorsResponse {
  success: boolean;
  data: Vendor[];
}

interface VendorResponse {
  success: boolean;
  data: Vendor;
}

interface DeleteResponse {
  success: boolean;
  data?: { id: string };
}

// --- Hooks ---

export function useVendors(category?: VendorCategory) {
  return useQuery({
    queryKey: category ? [...QUERY_KEYS.vendors, category] : QUERY_KEYS.vendors,
    queryFn: async (): Promise<Vendor[]> => {
      const url = category ? `/api/vendors?category=${category}` : '/api/vendors';
      const result = await apiGet<VendorsResponse>(url);
      if (!result?.success) throw new Error('Failed to fetch vendors');
      return result.data ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useVendorSearch(q: string) {
  return useQuery({
    queryKey: QUERY_KEYS.search(q),
    queryFn: async (): Promise<Vendor[]> => {
      if (!q.trim()) return [];
      const result = await apiGet<VendorsResponse>(
        `/api/vendors/search?q=${encodeURIComponent(q)}`
      );
      if (!result?.success) throw new Error('Failed to search vendors');
      return result.data ?? [];
    },
    enabled: q.trim().length > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorInput): Promise<Vendor> => {
      const result = await apiPost<VendorResponse>('/api/vendors', input);
      if (!result?.success) throw new Error('Failed to create vendor');
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vendors });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vendorId,
      input,
    }: {
      vendorId: string;
      input: UpdateVendorInput;
    }): Promise<Vendor> => {
      const response = await apiFetch(`/api/vendors/${vendorId}`, 'PATCH', { body: input });
      const result = (await response.json()) as VendorResponse;
      if (!result?.success) throw new Error('Failed to update vendor');
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vendors });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string): Promise<void> => {
      const result = await apiDelete<DeleteResponse>(`/api/vendors/${vendorId}`);
      if (!result?.success) throw new Error('Failed to delete vendor');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vendors });
    },
  });
}
