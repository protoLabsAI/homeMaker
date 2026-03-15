/**
 * GET /api/vault/search?q=... — Search vault entries by name, tags, username, or URL
 */

import type { Request, Response } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { VaultService } from '../../services/vault-service.js';

const logger = createLogger('VaultRoutes:Search');

export function createSearchHandler(vaultService: VaultService) {
  return (req: Request, res: Response): void => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        return;
      }

      const entries = vaultService.search(query.trim());
      res.json({ success: true, data: entries, total: entries.length });
    } catch (error) {
      logger.error('Failed to search vault entries:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search vault entries',
      });
    }
  };
}
