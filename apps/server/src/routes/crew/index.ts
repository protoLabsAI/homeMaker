/**
 * Crew routes - HTTP API for the crew loop system
 *
 * Endpoints:
 *   GET  /api/crew/status         - Get all crew member states
 *   POST /api/crew/:id/trigger    - Manually trigger a check
 *   POST /api/crew/:id/enable     - Enable a crew member
 *   POST /api/crew/:id/disable    - Disable a crew member
 *   POST /api/crew/:id/schedule   - Update cron schedule
 */

import { Router } from 'express';
import type { CrewLoopService } from '../../services/crew-loop-service.js';
import { createGetStatusHandler } from './routes/get-status.js';
import { createTriggerHandler } from './routes/trigger.js';
import { createEnableHandler } from './routes/enable.js';
import { createDisableHandler } from './routes/disable.js';
import { createScheduleHandler } from './routes/schedule.js';

export function createCrewRoutes(crewLoopService: CrewLoopService): Router {
  const router = Router();

  router.get('/status', createGetStatusHandler(crewLoopService));
  router.post('/:id/trigger', createTriggerHandler(crewLoopService));
  router.post('/:id/enable', createEnableHandler(crewLoopService));
  router.post('/:id/disable', createDisableHandler(crewLoopService));
  router.post('/:id/schedule', createScheduleHandler(crewLoopService));

  return router;
}
