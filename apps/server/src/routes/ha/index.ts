/**
 * Home Assistant Integration Routes
 *
 * - POST /api/ha/test      — Test connection to a Home Assistant instance
 * - GET  /api/ha/entities  — List all entities from the configured HA instance
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { SettingsService } from '../../services/settings-service.js';

const logger = createLogger('HARoutes');

export function createHARoutes(settingsService: SettingsService): Router {
  const router = Router();

  /**
   * POST /api/ha/test
   * Test connection to a Home Assistant instance.
   * Body: { url: string; accessToken: string }
   * Returns: { success: true, data: { connected: boolean; version?: string; message?: string } }
   */
  router.post('/test', async (req, res) => {
    try {
      const { url, accessToken } = req.body as { url?: string; accessToken?: string };

      if (!url || typeof url !== 'string' || !url.trim()) {
        res.status(400).json({ success: false, error: 'url is required' });
        return;
      }
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        res.status(400).json({ success: false, error: 'accessToken is required' });
        return;
      }

      const baseUrl = url.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 401) {
        res.json({ success: true, data: { connected: false, message: 'Invalid access token' } });
        return;
      }

      if (!response.ok) {
        res.json({
          success: true,
          data: { connected: false, message: `HTTP ${response.status}` },
        });
        return;
      }

      const data = (await response.json()) as { message?: string; version?: string };
      res.json({
        success: true,
        data: { connected: true, message: data.message, version: data.version },
      });
    } catch (error) {
      logger.warn('HA connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Connection failed';
      res.json({ success: true, data: { connected: false, message } });
    }
  });

  /**
   * GET /api/ha/entities
   * List all entities from the configured Home Assistant instance.
   * Uses stored homeAssistant config from global settings.
   * Returns: { success: true, data: HAEntity[] }
   */
  router.get('/entities', async (_req, res) => {
    try {
      const settings = await settingsService.getGlobalSettings();
      const ha = settings.homeAssistant;

      if (!ha?.url || !ha?.accessToken) {
        res.status(400).json({
          success: false,
          error: 'Home Assistant is not configured. Set URL and access token first.',
        });
        return;
      }

      const baseUrl = ha.url.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/states`, {
        headers: { Authorization: `Bearer ${ha.accessToken}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const msg = response.status === 401 ? 'Invalid access token' : `HTTP ${response.status}`;
        res.status(502).json({ success: false, error: msg });
        return;
      }

      const states = (await response.json()) as Array<{
        entity_id: string;
        state: string;
        attributes: Record<string, unknown>;
        last_changed: string;
      }>;

      const entities = states.map((s) => ({
        entityId: s.entity_id,
        state: s.state,
        friendlyName: (s.attributes.friendly_name as string | undefined) ?? s.entity_id,
        domain: s.entity_id.split('.')[0] ?? s.entity_id,
        lastChanged: s.last_changed,
        syncEnabled: ha.entitySyncMap?.[s.entity_id] ?? false,
      }));

      res.json({ success: true, data: entities, total: entities.length });
    } catch (error) {
      logger.error('Failed to fetch HA entities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entities',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
