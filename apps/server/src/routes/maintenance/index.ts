/**
 * Maintenance Routes — CRUD and lifecycle endpoints for recurring maintenance schedules.
 *
 * Endpoints:
 *   POST   /                          — create schedule
 *   GET    /                          — list schedules (query: category, overdue, assetId, upcoming)
 *   GET    /overdue                   — get overdue schedules
 *   GET    /upcoming                  — get upcoming schedules (query: days=30)
 *   GET    /summary                   — get due-date summary counts
 *   GET    /:id                       — get single schedule
 *   PATCH  /:id                       — update schedule
 *   DELETE /:id                       — delete schedule
 *   POST   /:scheduleId/complete      — record completion
 *   GET    /:scheduleId/completions   — get completion history
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { MaintenanceCategory } from '@protolabsai/types';
import type { MaintenanceService } from '../../services/maintenance-service.js';

const logger = createLogger('MaintenanceRoutes');

const VALID_CATEGORIES: ReadonlySet<string> = new Set<MaintenanceCategory>([
  'hvac',
  'plumbing',
  'electrical',
  'exterior',
  'interior',
  'safety',
  'appliance',
  'landscaping',
  'pest-control',
  'other',
]);

export function createMaintenanceRoutes(maintenanceService: MaintenanceService): Router {
  const router = Router();

  // ── POST / — create schedule ─────────────────────────────────────────────

  router.post('/', (req, res) => {
    try {
      const {
        title,
        description,
        intervalDays,
        nextDueAt,
        assetId,
        category,
        estimatedCostUsd,
        vendorId,
        completedById,
      } = req.body as Record<string, unknown>;

      if (!title || typeof title !== 'string' || !title.trim()) {
        res
          .status(400)
          .json({ success: false, error: 'title is required and must be a non-empty string' });
        return;
      }

      if (intervalDays == null || typeof intervalDays !== 'number' || intervalDays < 1) {
        res
          .status(400)
          .json({
            success: false,
            error: 'intervalDays is required and must be a positive integer',
          });
        return;
      }

      if (!category || typeof category !== 'string' || !VALID_CATEGORIES.has(category)) {
        res.status(400).json({
          success: false,
          error: `category is required and must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      if (
        estimatedCostUsd != null &&
        (typeof estimatedCostUsd !== 'number' || estimatedCostUsd < 0)
      ) {
        res
          .status(400)
          .json({ success: false, error: 'estimatedCostUsd must be a non-negative number' });
        return;
      }

      const schedule = maintenanceService.create({
        title: (title as string).trim(),
        description: typeof description === 'string' ? description : null,
        intervalDays: intervalDays as number,
        nextDueAt: typeof nextDueAt === 'string' ? nextDueAt : undefined,
        assetId: typeof assetId === 'string' ? assetId : null,
        category: category as MaintenanceCategory,
        estimatedCostUsd: typeof estimatedCostUsd === 'number' ? estimatedCostUsd : null,
        vendorId: typeof vendorId === 'string' ? vendorId : null,
        completedById: typeof completedById === 'string' ? completedById : null,
      });

      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Failed to create maintenance schedule:', error);
      res.status(500).json({ success: false, error: 'Failed to create maintenance schedule' });
    }
  });

  // ── GET / — list schedules ───────────────────────────────────────────────

  router.get('/', (req, res) => {
    try {
      const { category, overdue, assetId, upcoming } = req.query as Record<
        string,
        string | undefined
      >;

      const schedule = maintenanceService.list({
        category:
          category && VALID_CATEGORIES.has(category)
            ? (category as MaintenanceCategory)
            : undefined,
        overdue: overdue === 'true',
        assetId: assetId ?? undefined,
        upcoming: upcoming != null ? parseInt(upcoming, 10) || undefined : undefined,
      });

      res.json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Failed to list maintenance schedules:', error);
      res.status(500).json({ success: false, error: 'Failed to list maintenance schedules' });
    }
  });

  // ── GET /overdue — static route BEFORE /:id ──────────────────────────────

  router.get('/overdue', (_req, res) => {
    try {
      const schedules = maintenanceService.getOverdue();
      res.json({ success: true, data: schedules });
    } catch (error) {
      logger.error('Failed to get overdue schedules:', error);
      res.status(500).json({ success: false, error: 'Failed to get overdue schedules' });
    }
  });

  // ── GET /upcoming — static route BEFORE /:id ─────────────────────────────

  router.get('/upcoming', (req, res) => {
    try {
      const days = parseInt((req.query as Record<string, string>).days ?? '30', 10);
      const schedules = maintenanceService.getUpcoming(days);
      res.json({ success: true, data: schedules });
    } catch (error) {
      logger.error('Failed to get upcoming schedules:', error);
      res.status(500).json({ success: false, error: 'Failed to get upcoming schedules' });
    }
  });

  // ── GET /summary — static route BEFORE /:id ──────────────────────────────

  router.get('/summary', (_req, res) => {
    try {
      const summary = maintenanceService.getDueSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Failed to get maintenance summary:', error);
      res.status(500).json({ success: false, error: 'Failed to get maintenance summary' });
    }
  });

  // ── GET /:id — get single schedule ────────────────────────────────────────

  router.get('/:id', (req, res) => {
    try {
      const schedule = maintenanceService.get(req.params.id);
      if (!schedule) {
        res.status(404).json({ success: false, error: `Schedule "${req.params.id}" not found` });
        return;
      }
      res.json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Failed to get maintenance schedule:', error);
      res.status(500).json({ success: false, error: 'Failed to get maintenance schedule' });
    }
  });

  // ── PATCH /:id — update schedule ──────────────────────────────────────────

  router.patch('/:id', (req, res) => {
    try {
      const {
        title,
        description,
        intervalDays,
        nextDueAt,
        assetId,
        category,
        estimatedCostUsd,
        vendorId,
        completedById,
      } = req.body as Record<string, unknown>;

      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        res.status(400).json({ success: false, error: 'title must be a non-empty string' });
        return;
      }

      if (intervalDays !== undefined && (typeof intervalDays !== 'number' || intervalDays < 1)) {
        res.status(400).json({ success: false, error: 'intervalDays must be a positive integer' });
        return;
      }

      if (
        category !== undefined &&
        (typeof category !== 'string' || !VALID_CATEGORIES.has(category))
      ) {
        res.status(400).json({
          success: false,
          error: `category must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      if (
        estimatedCostUsd !== undefined &&
        estimatedCostUsd !== null &&
        (typeof estimatedCostUsd !== 'number' || estimatedCostUsd < 0)
      ) {
        res
          .status(400)
          .json({
            success: false,
            error: 'estimatedCostUsd must be a non-negative number or null',
          });
        return;
      }

      const schedule = maintenanceService.update(req.params.id, {
        title: typeof title === 'string' ? title.trim() : undefined,
        description:
          description !== undefined
            ? typeof description === 'string'
              ? description
              : null
            : undefined,
        intervalDays: typeof intervalDays === 'number' ? intervalDays : undefined,
        nextDueAt: typeof nextDueAt === 'string' ? nextDueAt : undefined,
        assetId: assetId !== undefined ? (typeof assetId === 'string' ? assetId : null) : undefined,
        category: typeof category === 'string' ? (category as MaintenanceCategory) : undefined,
        estimatedCostUsd:
          estimatedCostUsd !== undefined
            ? typeof estimatedCostUsd === 'number'
              ? estimatedCostUsd
              : null
            : undefined,
        vendorId:
          vendorId !== undefined ? (typeof vendorId === 'string' ? vendorId : null) : undefined,
        completedById:
          completedById !== undefined
            ? typeof completedById === 'string'
              ? completedById
              : null
            : undefined,
      });

      res.json({ success: true, data: schedule });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to update maintenance schedule:', error);
      res.status(500).json({ success: false, error: 'Failed to update maintenance schedule' });
    }
  });

  // ── DELETE /:id — delete schedule ─────────────────────────────────────────

  router.delete('/:id', (req, res) => {
    try {
      maintenanceService.delete(req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to delete maintenance schedule:', error);
      res.status(500).json({ success: false, error: 'Failed to delete maintenance schedule' });
    }
  });

  // ── POST /:scheduleId/complete — record completion ────────────────────────

  router.post('/:scheduleId/complete', (req, res) => {
    try {
      const { completedBy, completedAt, notes, actualCostUsd } = req.body as Record<
        string,
        unknown
      >;

      if (!completedBy || typeof completedBy !== 'string' || !completedBy.trim()) {
        res
          .status(400)
          .json({
            success: false,
            error: 'completedBy is required and must be a non-empty string',
          });
        return;
      }

      if (actualCostUsd != null && (typeof actualCostUsd !== 'number' || actualCostUsd < 0)) {
        res
          .status(400)
          .json({ success: false, error: 'actualCostUsd must be a non-negative number' });
        return;
      }

      const completion = maintenanceService.complete(req.params.scheduleId, {
        completedBy: (completedBy as string).trim(),
        completedAt: typeof completedAt === 'string' ? completedAt : undefined,
        notes: typeof notes === 'string' ? notes : null,
        actualCostUsd: typeof actualCostUsd === 'number' ? actualCostUsd : null,
      });

      res.status(201).json({ success: true, data: completion });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to complete maintenance schedule:', error);
      res.status(500).json({ success: false, error: 'Failed to complete maintenance schedule' });
    }
  });

  // ── GET /:scheduleId/completions — completion history ─────────────────────

  router.get('/:scheduleId/completions', (req, res) => {
    try {
      const completions = maintenanceService.getCompletions(req.params.scheduleId);
      res.json({ success: true, data: completions });
    } catch (error) {
      logger.error('Failed to get completion history:', error);
      res.status(500).json({ success: false, error: 'Failed to get completion history' });
    }
  });

  return router;
}
