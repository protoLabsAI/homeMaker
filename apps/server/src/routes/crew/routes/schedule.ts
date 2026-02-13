/**
 * POST /api/crew/:id/schedule - Update a crew member's cron schedule
 *
 * Body: `{ "schedule": "0/15 * * * *" }`
 */

import type { Request, Response } from 'express';
import type { CrewLoopService } from '../../../services/crew-loop-service.js';

export function createScheduleHandler(crewLoopService: CrewLoopService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({ success: false, error: 'Member ID required' });
        return;
      }

      const { schedule } = req.body as { schedule?: string };
      if (!schedule || typeof schedule !== 'string') {
        res
          .status(400)
          .json({ success: false, error: 'schedule (cron expression) required in body' });
        return;
      }

      await crewLoopService.updateSchedule(id, schedule);
      res.json({ success: true, message: `Crew member "${id}" schedule updated to: ${schedule}` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const status = errorMessage.includes('Unknown') ? 404 : 500;
      res.status(status).json({ success: false, error: errorMessage });
    }
  };
}
