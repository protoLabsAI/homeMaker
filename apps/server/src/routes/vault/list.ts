/**
 * GET /api/vault — List all vault entries (without values)
 */

import type { Request, Response } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:List');

export function createListHandler(vaultService: VaultService) {
  return (_req: Request, res: Response): void => {
    try {
      const entries = vaultService.list();
      res.json({ success: true, data: entries, total: entries.length });
    } catch (error) {
      logger.error('Failed to list vault entries:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list vault entries',
      });
    }
  };
}
