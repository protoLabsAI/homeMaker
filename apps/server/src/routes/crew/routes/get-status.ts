/**
 * GET /api/crew/status - Get crew loop system status
 *
 * Returns all registered crew members with their states, schedules,
 * last check results, and escalation history.
 */

import type { Request, Response } from 'express';
import type { CrewLoopService } from '../../../services/crew-loop-service.js';

export function createGetStatusHandler(crewLoopService: CrewLoopService) {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = crewLoopService.getStatus();
      res.json({ success: true, ...status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, error: errorMessage });
    }
  };
}
