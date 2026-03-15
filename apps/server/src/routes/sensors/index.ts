/**
 * Sensor Registry API Routes
 *
 * - POST /api/sensors/register — Register a new sensor (or re-register an existing one)
 * - POST /api/sensors/report   — Report a sensor reading (requires API key auth)
 * - GET  /api/sensors          — List all registered sensors
 * - GET  /api/sensors/:id      — Get a single sensor by id
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { SensorRegistryService } from '../../services/sensor-registry-service.js';

const logger = createLogger('SensorRoutes');

export function createSensorRoutes(sensorRegistryService: SensorRegistryService): Router {
  const router = Router();

  /**
   * POST /api/sensors/register
   * Register a sensor or re-register it after a restart.
   * Body: { id: string; name: string; description?: string }
   */
  router.post('/register', (req, res) => {
    try {
      const { id, name, description } = req.body as {
        id?: string;
        name?: string;
        description?: string;
      };

      const result = sensorRegistryService.register({
        id: id ?? '',
        name: name ?? '',
        description,
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      logger.info(`Sensor registered via API: "${result.sensor?.id}"`);
      res.status(201).json({ success: true, sensor: result.sensor });
    } catch (error) {
      logger.error('Failed to register sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register sensor',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/sensors/report
   * Report a data reading from a registered sensor. Requires API key authentication
   * (handled by the global authMiddleware applied in routes.ts).
   * Body: { sensorId: string; data: Record<string, unknown> }
   */
  router.post('/report', (req, res) => {
    try {
      const { sensorId, data } = req.body as {
        sensorId?: string;
        data?: Record<string, unknown>;
      };

      if (!sensorId || typeof sensorId !== 'string') {
        res.status(400).json({ success: false, error: 'sensorId is required' });
        return;
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data must be a non-array object' });
        return;
      }

      const result = sensorRegistryService.report({ sensorId, data });

      if (!result.success) {
        res.status(404).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true, reading: result.reading });
    } catch (error) {
      logger.error('Failed to report sensor data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to report sensor data',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/sensors
   * List all registered sensors with their latest readings and computed state.
   */
  router.get('/', (_req, res) => {
    try {
      const sensors = sensorRegistryService.getAll();
      res.json({ success: true, sensors, total: sensors.length });
    } catch (error) {
      logger.error('Failed to list sensors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list sensors',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/sensors/:id/history
   * Query historical readings for a sensor.
   * Query params: startDate, endDate, limit (default 100)
   */
  router.get('/:id/history', (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate, limit } = req.query as {
        startDate?: string;
        endDate?: string;
        limit?: string;
      };

      const sensor = sensorRegistryService.get(id);
      if (!sensor) {
        res.status(404).json({ success: false, error: `Sensor "${id}" not found` });
        return;
      }

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit < 1)) {
        res.status(400).json({ success: false, error: 'limit must be a positive integer' });
        return;
      }

      const readings = sensorRegistryService.getHistory(id, {
        startDate,
        endDate,
        limit: parsedLimit,
      });

      res.json({ success: true, readings, total: readings.length });
    } catch (error) {
      logger.error('Failed to get sensor history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sensor history',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/sensors/:id/history/aggregated
   * Query aggregated historical data for a sensor.
   * Query params: interval (hour|day|week), field, startDate, endDate
   */
  router.get('/:id/history/aggregated', (req, res) => {
    try {
      const { id } = req.params;
      const { interval, field, startDate, endDate } = req.query as {
        interval?: string;
        field?: string;
        startDate?: string;
        endDate?: string;
      };

      const sensor = sensorRegistryService.get(id);
      if (!sensor) {
        res.status(404).json({ success: false, error: `Sensor "${id}" not found` });
        return;
      }

      if (!interval || !['hour', 'day', 'week'].includes(interval)) {
        res.status(400).json({
          success: false,
          error: 'interval is required and must be one of: hour, day, week',
        });
        return;
      }

      if (!field || typeof field !== 'string' || !field.trim()) {
        res.status(400).json({
          success: false,
          error: 'field is required and must be a non-empty string',
        });
        return;
      }

      const data = sensorRegistryService.getHistoryAggregated(id, {
        interval: interval as 'hour' | 'day' | 'week',
        field: field.trim(),
        startDate,
        endDate,
      });

      res.json({ success: true, data, total: data.length });
    } catch (error) {
      logger.error('Failed to get aggregated sensor history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get aggregated sensor history',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/sensors/:id
   * Get a single sensor by id.
   */
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const entry = sensorRegistryService.get(id);

      if (!entry) {
        res.status(404).json({ success: false, error: `Sensor "${id}" not found` });
        return;
      }

      res.json({ success: true, ...entry });
    } catch (error) {
      logger.error('Failed to get sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sensor',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
