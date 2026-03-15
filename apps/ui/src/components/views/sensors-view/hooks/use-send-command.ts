/**
 * Send Command Mutation Hook
 *
 * Provides a mutation for posting a command to a sensor via
 * POST /api/sensors/:id/command. Uses React Query's useMutation
 * for lifecycle management and error handling.
 */

import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api-fetch';
import { toast } from 'sonner';
import type { SensorCommandAction } from '@protolabsai/types';

interface SendCommandInput {
  sensorId: string;
  action: SensorCommandAction;
  payload?: Record<string, unknown>;
}

interface SendCommandResponse {
  success: boolean;
  commandId?: string;
  error?: string;
}

/**
 * Mutation hook that queues a command for an IoT device.
 * Shows a toast on success or failure.
 */
export function useSendCommand() {
  return useMutation({
    mutationFn: async (input: SendCommandInput) => {
      const result = await apiPost<SendCommandResponse>(
        `/api/sensors/${encodeURIComponent(input.sensorId)}/command`,
        {
          action: input.action,
          payload: input.payload,
        }
      );

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to queue command');
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Command "${variables.action}" queued successfully`);
    },
    onError: (error: Error) => {
      toast.error('Failed to send command', {
        description: error.message,
      });
    },
  });
}
