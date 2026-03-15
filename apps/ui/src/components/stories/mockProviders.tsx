/**
 * Storybook decorator providers for components that depend on React Query
 * or other context providers.
 */

import type { ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a React Query decorator that pre-populates the cache with mock data.
 *
 * Usage:
 *   decorators: [withQueryClient([{ queryKey: ['key'], data: mockData }])]
 */
export function withQueryClient(
  initialData?: Array<{ queryKey: unknown[]; data: unknown }>
): Decorator {
  return (Story) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    // Pre-populate cache
    if (initialData) {
      for (const { queryKey, data } of initialData) {
        queryClient.setQueryData(queryKey, data);
      }
    }

    return (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ) as ReactNode;
  };
}

/** Minimal React Query provider with no pre-populated data */
export const withQueryClientDecorator: Decorator = (Story) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        enabled: false, // Disable real network calls in Storybook
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  ) as ReactNode;
};
