/**
 * Quest Routes — lifecycle management for AI-generated quests.
 *
 * All endpoints live under the /gamification/quests prefix:
 *
 *   GET  /                — list active quests
 *   POST /:id/complete    — manually complete a quest by ID
 *   POST /generate        — trigger on-demand quest generation
 */

import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '@protolabsai/utils';
import type { GamificationService } from '../../services/gamification-service.js';
import type { QuestGeneratorService } from '../../services/quest-generator-service.js';

const logger = createLogger('QuestRoutes');

const completeQuestParamsSchema = z.object({
  id: z.string().min(1, 'Quest ID is required'),
});

export function createQuestRoutes(
  gamificationService: GamificationService,
  questGeneratorService: QuestGeneratorService
): Router {
  const router = Router();

  /** GET /gamification/quests — list active quests */
  router.get('/', (_req, res) => {
    try {
      const quests = gamificationService.getQuests();
      res.json({ success: true, data: quests });
    } catch (error) {
      logger.error('Failed to list quests:', error);
      res.status(500).json({ success: false, error: 'Failed to list quests' });
    }
  });

  /** POST /gamification/quests/:id/complete — manually complete a quest */
  router.post('/:id/complete', (req, res) => {
    try {
      const parsed = completeQuestParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join('; '),
        });
        return;
      }

      const quest = gamificationService.completeQuestById(parsed.data.id);
      if (!quest) {
        res
          .status(404)
          .json({
            success: false,
            error: `Quest "${parsed.data.id}" not found or already completed`,
          });
        return;
      }

      res.json({ success: true, data: quest });
    } catch (error) {
      logger.error('Failed to complete quest:', error);
      res.status(500).json({ success: false, error: 'Failed to complete quest' });
    }
  });

  /** POST /gamification/quests/generate — trigger quest generation on demand */
  router.post('/generate', (_req, res) => {
    try {
      const generated = questGeneratorService.generateQuests();
      res.json({ success: true, data: generated });
    } catch (error) {
      logger.error('Failed to generate quests:', error);
      res.status(500).json({ success: false, error: 'Failed to generate quests' });
    }
  });

  return router;
}
