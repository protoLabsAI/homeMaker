/**
 * PATCH /api/vault/:id — Update an existing vault entry
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:Update');

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  category: z.enum(['password', 'api-key', 'wifi', 'code', 'note', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  username: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export function createUpdateHandler(vaultService: VaultService) {
  return (req: Request, res: Response): void => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'id parameter is required' });
        return;
      }

      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join('; '),
        });
        return;
      }

      const entry = vaultService.update(id, parsed.data);
      if (!entry) {
        res.status(404).json({ success: false, error: `Vault entry "${id}" not found` });
        return;
      }

      res.json({ success: true, data: entry });
    } catch (error) {
      logger.error('Failed to update vault entry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update vault entry',
      });
    }
  };
}
