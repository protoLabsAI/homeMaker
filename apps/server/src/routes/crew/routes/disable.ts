/**
 * POST /api/crew/:id/disable - Disable a crew member
 *
 * Disables the member and deactivates its scheduler task.
 */

import type { Request, Response } from 'express';
import type { CrewLoopService } from '../../../services/crew-loop-service.js';

export function createDisableHandler(crewLoopService: CrewLoopService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({ success: false, error: 'Member ID required' });
        return;
      }

      await crewLoopService.disableMember(id);
      res.json({ success: true, message: `Crew member "${id}" disabled` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const status = errorMessage.includes('Unknown') ? 404 : 500;
      res.status(status).json({ success: false, error: errorMessage });
    }
  };
}
