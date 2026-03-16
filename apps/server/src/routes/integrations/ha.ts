/**
 * Home Assistant integration routes
 *
 * GET  /api/integrations/ha/status   — Connection status + entity count
 * POST /api/integrations/ha/connect  — Configure and connect to HA
 * POST /api/integrations/ha/disconnect — Disconnect from HA
 * GET  /api/integrations/ha/entities — List all known HA entity states
 */

import { Router, type Request, type Response } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { HAClientService } from '../../services/ha-client-service.js';

const logger = createLogger('HaRoutes');

export function createHaRoutes(haClientService: HAClientService): Router {
  const router = Router();

  /**
   * GET /api/integrations/ha/status
   * Returns the current HA connection status and entity count.
   */
  router.get('/status', (_req: Request, res: Response) => {
    try {
      const status = haClientService.getStatus();
      res.json({ success: true, data: status });
    } catch (err) {
      logger.error('Failed to get HA status:', err);
      res.status(500).json({ success: false, error: 'Failed to get HA status' });
    }
  });

  /**
   * POST /api/integrations/ha/connect
   * Configure and connect to Home Assistant.
   * Body: { url: string, token: string }
   */
  router.post('/connect', async (req: Request, res: Response) => {
    try {
      const { url, token } = req.body as { url?: unknown; token?: unknown };

      if (!url || typeof url !== 'string' || !url.trim()) {
        res.status(400).json({ success: false, error: 'url is required (string)' });
        return;
      }

      if (!token || typeof token !== 'string' || !token.trim()) {
        res.status(400).json({ success: false, error: 'token is required (string)' });
        return;
      }

      await haClientService.connect({ url: url.trim(), token: token.trim() });

      logger.info(`HA connect requested for ${url}`);
      res.json({ success: true, data: haClientService.getStatus() });
    } catch (err) {
      logger.error('Failed to connect to HA:', err);
      res.status(500).json({ success: false, error: 'Failed to initiate HA connection' });
    }
  });

  /**
   * POST /api/integrations/ha/disconnect
   * Disconnect from Home Assistant and stop all reconnect attempts.
   */
  router.post('/disconnect', (_req: Request, res: Response) => {
    try {
      haClientService.disconnect();
      res.json({ success: true, data: haClientService.getStatus() });
    } catch (err) {
      logger.error('Failed to disconnect from HA:', err);
      res.status(500).json({ success: false, error: 'Failed to disconnect from HA' });
    }
  });

  /**
   * GET /api/integrations/ha/entities
   * Returns the list of all known HA entity states.
   */
  router.get('/entities', (_req: Request, res: Response) => {
    try {
      const entities = haClientService.getEntities();
      res.json({ success: true, data: { entities, count: entities.length } });
    } catch (err) {
      logger.error('Failed to list HA entities:', err);
      res.status(500).json({ success: false, error: 'Failed to list HA entities' });
    }
  });

  return router;
}
