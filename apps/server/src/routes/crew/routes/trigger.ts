/**
 * POST /api/crew/:id/trigger - Manually trigger a crew member check
 *
 * Runs the check immediately regardless of schedule. Useful for testing
 * or when you want to force a check outside the normal cadence.
 */

import type { Request, Response } from 'express';
import type { CrewLoopService } from '../../../services/crew-loop-service.js';

export function createTriggerHandler(crewLoopService: CrewLoopService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({ success: false, error: 'Member ID required' });
        return;
      }

      const member = crewLoopService.getMember(id);
      if (!member) {
        res.status(404).json({ success: false, error: `Unknown crew member: ${id}` });
        return;
      }

      const result = await crewLoopService.runCheck(id);
      res.json({ success: true, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: errorMessage });
    }
  };
}
