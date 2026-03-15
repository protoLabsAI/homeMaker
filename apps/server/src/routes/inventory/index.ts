/**
 * Inventory Routes — CRUD, search, and reporting for household assets.
 *
 * All endpoints live under the /inventory prefix:
 *
 *   POST   /                — create a new asset
 *   GET    /                — list assets (optional query params: category, location, warrantyExpiring)
 *   GET    /search?q=...    — full-text search
 *   GET    /warranty-report — assets grouped by warranty status
 *   GET    /total-value     — replacement cost totals by category
 *   GET    /:id             — get a single asset
 *   PATCH  /:id             — partial update
 *   DELETE /:id             — delete an asset
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { InventoryService } from '../../services/inventory-service.js';
import type { CreateAssetInput, UpdateAssetInput, AssetCategory } from '@protolabsai/types';
import type { EventEmitter } from '../../lib/events.js';

const logger = createLogger('InventoryRoutes');

const VALID_CATEGORIES: ReadonlySet<string> = new Set<AssetCategory>([
  'appliance',
  'furniture',
  'electronics',
  'plumbing',
  'hvac',
  'electrical',
  'structural',
  'outdoor',
  'vehicle',
  'other',
]);

export function createInventoryRoutes(
  inventoryService: InventoryService,
  events?: EventEmitter
): Router {
  const router = Router();

  // ── Search (must come before /:id to avoid route collision) ─────────────

  /** GET /inventory/search?q=... */
  router.get('/search', (req, res) => {
    try {
      const q = req.query.q;
      if (!q || typeof q !== 'string' || !q.trim()) {
        res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        return;
      }
      const assets = inventoryService.search(q.trim());
      res.json({ success: true, data: assets });
    } catch (error) {
      logger.error('Failed to search assets:', error);
      res.status(500).json({ success: false, error: 'Failed to search assets' });
    }
  });

  // ── Reports (must come before /:id) ────────────────────────────────────

  /** GET /inventory/warranty-report */
  router.get('/warranty-report', (_req, res) => {
    try {
      const report = inventoryService.getWarrantyReport();
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Failed to generate warranty report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate warranty report' });
    }
  });

  /** GET /inventory/total-value */
  router.get('/total-value', (_req, res) => {
    try {
      const report = inventoryService.getTotalValue();
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Failed to generate total value report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate total value report' });
    }
  });

  // ── CRUD ───────────────────────────────────────────────────────────────

  /** POST /inventory */
  router.post('/', (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        res
          .status(400)
          .json({ success: false, error: 'name is required and must be a non-empty string' });
        return;
      }

      if (
        !body.category ||
        typeof body.category !== 'string' ||
        !VALID_CATEGORIES.has(body.category)
      ) {
        res.status(400).json({
          success: false,
          error: `category is required and must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      const input: CreateAssetInput = {
        name: body.name.trim(),
        category: body.category as AssetCategory,
        location: typeof body.location === 'string' ? body.location : '',
        purchaseDate: typeof body.purchaseDate === 'string' ? body.purchaseDate : null,
        purchasePrice: typeof body.purchasePrice === 'number' ? body.purchasePrice : null,
        warrantyExpiration:
          typeof body.warrantyExpiration === 'string' ? body.warrantyExpiration : null,
        modelNumber: typeof body.modelNumber === 'string' ? body.modelNumber : null,
        serialNumber: typeof body.serialNumber === 'string' ? body.serialNumber : null,
        manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer : null,
        manualUrl: typeof body.manualUrl === 'string' ? body.manualUrl : null,
        replacementCost: typeof body.replacementCost === 'number' ? body.replacementCost : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        sensorIds: Array.isArray(body.sensorIds) ? (body.sensorIds as string[]) : [],
        photoUrls: Array.isArray(body.photoUrls) ? (body.photoUrls as string[]) : [],
      };

      const asset = inventoryService.create(input);
      const hasPhoto = asset.photoUrls.length > 0;
      const hasReceipt = asset.purchasePrice != null;
      events?.emit('inventory:asset-created', {
        assetId: asset.id,
        hasPhotoAndReceipt: hasPhoto && hasReceipt,
      });
      res.status(201).json({ success: true, data: asset });
    } catch (error) {
      logger.error('Failed to create asset:', error);
      res.status(500).json({ success: false, error: 'Failed to create asset' });
    }
  });

  /** GET /inventory */
  router.get('/', (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const location = req.query.location as string | undefined;
      const warrantyExpiring = req.query.warrantyExpiring === 'true';

      if (category && !VALID_CATEGORIES.has(category)) {
        res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      const assets = inventoryService.list({
        category: category as AssetCategory | undefined,
        location,
        warrantyExpiring: warrantyExpiring || undefined,
      });
      res.json({ success: true, data: assets });
    } catch (error) {
      logger.error('Failed to list assets:', error);
      res.status(500).json({ success: false, error: 'Failed to list assets' });
    }
  });

  /** GET /inventory/:id */
  router.get('/:id', (req, res) => {
    try {
      const asset = inventoryService.get(req.params.id);
      if (!asset) {
        res.status(404).json({ success: false, error: `Asset "${req.params.id}" not found` });
        return;
      }
      res.json({ success: true, data: asset });
    } catch (error) {
      logger.error('Failed to get asset:', error);
      res.status(500).json({ success: false, error: 'Failed to get asset' });
    }
  });

  /** PATCH /inventory/:id */
  router.patch('/:id', (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      if (
        body.category &&
        (typeof body.category !== 'string' || !VALID_CATEGORIES.has(body.category))
      ) {
        res.status(400).json({
          success: false,
          error: `category must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      const changes: UpdateAssetInput = {};

      if (typeof body.name === 'string') changes.name = body.name.trim();
      if (typeof body.category === 'string') changes.category = body.category as AssetCategory;
      if (typeof body.location === 'string') changes.location = body.location;
      if (body.purchaseDate !== undefined)
        changes.purchaseDate = typeof body.purchaseDate === 'string' ? body.purchaseDate : null;
      if (body.purchasePrice !== undefined)
        changes.purchasePrice = typeof body.purchasePrice === 'number' ? body.purchasePrice : null;
      if (body.warrantyExpiration !== undefined)
        changes.warrantyExpiration =
          typeof body.warrantyExpiration === 'string' ? body.warrantyExpiration : null;
      if (body.modelNumber !== undefined)
        changes.modelNumber = typeof body.modelNumber === 'string' ? body.modelNumber : null;
      if (body.serialNumber !== undefined)
        changes.serialNumber = typeof body.serialNumber === 'string' ? body.serialNumber : null;
      if (body.manufacturer !== undefined)
        changes.manufacturer = typeof body.manufacturer === 'string' ? body.manufacturer : null;
      if (body.manualUrl !== undefined)
        changes.manualUrl = typeof body.manualUrl === 'string' ? body.manualUrl : null;
      if (body.replacementCost !== undefined)
        changes.replacementCost =
          typeof body.replacementCost === 'number' ? body.replacementCost : null;
      if (body.notes !== undefined)
        changes.notes = typeof body.notes === 'string' ? body.notes : null;
      if (Array.isArray(body.sensorIds)) changes.sensorIds = body.sensorIds as string[];
      if (Array.isArray(body.photoUrls)) changes.photoUrls = body.photoUrls as string[];

      const updated = inventoryService.update(req.params.id, changes);
      if (!updated) {
        res.status(404).json({ success: false, error: `Asset "${req.params.id}" not found` });
        return;
      }
      events?.emit('inventory:asset-updated', { assetId: req.params.id });
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Failed to update asset:', error);
      res.status(500).json({ success: false, error: 'Failed to update asset' });
    }
  });

  /** DELETE /inventory/:id */
  router.delete('/:id', (req, res) => {
    try {
      inventoryService.delete(req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to delete asset:', error);
      res.status(500).json({ success: false, error: 'Failed to delete asset' });
    }
  });

  return router;
}
