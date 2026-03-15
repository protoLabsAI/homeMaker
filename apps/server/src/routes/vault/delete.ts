/**
 * DELETE /api/vault/:id — Delete a vault entry
 */

import type { Request, Response } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:Delete');

export function createDeleteHandler(vaultService: VaultService) {
  return (req: Request, res: Response): void => {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'id parameter is required' });
        return;
      }

      const deleted = vaultService.delete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: `Vault entry "${id}" not found` });
        return;
      }

      res.json({ success: true, data: { id } });
    } catch (error) {
      logger.error('Failed to delete vault entry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete vault entry',
      });
    }
  };
}
