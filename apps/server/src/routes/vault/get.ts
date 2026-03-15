/**
 * GET /api/vault/:id — Get a single vault entry with decrypted value
 */

import type { Request, Response } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:Get');

export function createGetHandler(vaultService: VaultService) {
  return (req: Request, res: Response): void => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'id parameter is required' });
        return;
      }

      const entry = vaultService.getById(id);
      if (!entry) {
        res.status(404).json({ success: false, error: `Vault entry "${id}" not found` });
        return;
      }

      res.json({ success: true, data: entry });
    } catch (error) {
      logger.error('Failed to get vault entry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vault entry',
      });
    }
  };
}
