/**
 * POST /api/vault — Create a new vault entry
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:Create');

const CreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  value: z.string().min(1, 'value is required'),
  category: z.enum(['password', 'api-key', 'wifi', 'code', 'note', 'other']),
  tags: z.array(z.string()).optional().default([]),
  username: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export function createCreateHandler(vaultService: VaultService) {
  return (req: Request, res: Response): void => {
    try {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join('; '),
        });
        return;
      }

      const entry = vaultService.create(parsed.data);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      logger.error('Failed to create vault entry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vault entry',
      });
    }
  };
}
