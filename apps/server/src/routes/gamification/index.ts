/**
 * Gamification Routes — XP, levels, achievements, health score, and quests.
 *
 * All endpoints live under the /gamification prefix:
 *
 *   GET  /profile                         — full GamificationProfile
 *   GET  /achievements                    — achievement catalog with earned status
 *   POST /mark-achievement-seen/:id       — dismiss "new" indicator for an achievement
 *   GET  /health-score                    — recalculate and return home health score
 *   GET  /quests                          — active quest list
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { GamificationService } from '../../services/gamification-service.js';

const logger = createLogger('GamificationRoutes');

export function createGamificationRoutes(gamificationService: GamificationService): Router {
  const router = Router();

  /** GET /gamification/profile */
  router.get('/profile', (_req, res) => {
    try {
      const profile = gamificationService.getProfile();
      res.json({ success: true, data: profile });
    } catch (error) {
      logger.error('Failed to get gamification profile:', error);
      res.status(500).json({ success: false, error: 'Failed to get gamification profile' });
    }
  });

  /** GET /gamification/achievements */
  router.get('/achievements', (_req, res) => {
    try {
      const achievements = gamificationService.getAchievements();
      res.json({ success: true, data: achievements });
    } catch (error) {
      logger.error('Failed to get achievements:', error);
      res.status(500).json({ success: false, error: 'Failed to get achievements' });
    }
  });

  /** POST /gamification/mark-achievement-seen/:id */
  router.post('/mark-achievement-seen/:id', (req, res) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ success: false, error: 'Achievement id is required' });
        return;
      }
      const found = gamificationService.markAchievementSeen(id);
      if (!found) {
        res
          .status(404)
          .json({ success: false, error: `Achievement "${id}" not found or not earned` });
        return;
      }
      res.json({ success: true, data: { id } });
    } catch (error) {
      logger.error('Failed to mark achievement seen:', error);
      res.status(500).json({ success: false, error: 'Failed to mark achievement seen' });
    }
  });

  /** GET /gamification/health-score */
  router.get('/health-score', (_req, res) => {
    try {
      const score = gamificationService.calculateHomeHealthScore();
      res.json({ success: true, data: score });
    } catch (error) {
      logger.error('Failed to calculate health score:', error);
      res.status(500).json({ success: false, error: 'Failed to calculate health score' });
    }
  });

  /** GET /gamification/quests */
  router.get('/quests', (_req, res) => {
    try {
      const quests = gamificationService.getQuests();
      res.json({ success: true, data: quests });
    } catch (error) {
      logger.error('Failed to get quests:', error);
      res.status(500).json({ success: false, error: 'Failed to get quests' });
    }
  });

  return router;
}
