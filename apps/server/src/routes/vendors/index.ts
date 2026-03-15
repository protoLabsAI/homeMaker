/**
 * Vendor Routes — CRUD, search, and filtering for the vendor/contractor directory.
 *
 * All endpoints live under the /vendors prefix:
 *
 *   POST   /                        — create a new vendor
 *   GET    /                        — list vendors (optional query param: category)
 *   GET    /search?q=...            — full-text search across name, company, notes
 *   GET    /by-category/:category   — filter by trade category
 *   GET    /for-asset/:assetId      — vendors linked to a specific asset
 *   GET    /:id                     — get a single vendor
 *   PATCH  /:id                     — partial update
 *   DELETE /:id                     — delete a vendor
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { VendorService } from '../../services/vendor-service.js';
import type { VendorCategory, CreateVendorInput, UpdateVendorInput } from '@protolabsai/types';

const logger = createLogger('VendorRoutes');

const VALID_CATEGORIES: ReadonlySet<string> = new Set<VendorCategory>([
  'plumber',
  'electrician',
  'hvac',
  'landscaper',
  'general-contractor',
  'painter',
  'roofer',
  'pest-control',
  'cleaning',
  'insurance',
  'other',
]);

export function createVendorRoutes(vendorService: VendorService): Router {
  const router = Router();

  // ── Search (must come before /:id to avoid route collision) ─────────────

  /** GET /vendors/search?q=... */
  router.get('/search', (req, res) => {
    try {
      const q = req.query.q;
      if (!q || typeof q !== 'string' || !q.trim()) {
        res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        return;
      }
      const vendors = vendorService.search(q.trim());
      res.json({ success: true, data: vendors });
    } catch (error) {
      logger.error('Failed to search vendors:', error);
      res.status(500).json({ success: false, error: 'Failed to search vendors' });
    }
  });

  // ── Category filter (must come before /:id) ─────────────────────────────

  /** GET /vendors/by-category/:category */
  router.get('/by-category/:category', (req, res) => {
    try {
      const { category } = req.params;
      if (!VALID_CATEGORIES.has(category)) {
        res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }
      const vendors = vendorService.listByCategory(category as VendorCategory);
      res.json({ success: true, data: vendors });
    } catch (error) {
      logger.error('Failed to list vendors by category:', error);
      res.status(500).json({ success: false, error: 'Failed to list vendors by category' });
    }
  });

  // ── Asset-linked vendors (must come before /:id) ─────────────────────────

  /** GET /vendors/for-asset/:assetId */
  router.get('/for-asset/:assetId', (req, res) => {
    try {
      const vendors = vendorService.getForAsset(req.params.assetId);
      res.json({ success: true, data: vendors });
    } catch (error) {
      logger.error('Failed to list vendors for asset:', error);
      res.status(500).json({ success: false, error: 'Failed to list vendors for asset' });
    }
  });

  // ── CRUD ───────────────────────────────────────────────────────────────

  /** POST /vendors */
  router.post('/', (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        res
          .status(400)
          .json({ success: false, error: 'name is required and must be a non-empty string' });
        return;
      }

      if (!body.phone || typeof body.phone !== 'string' || !body.phone.trim()) {
        res
          .status(400)
          .json({ success: false, error: 'phone is required and must be a non-empty string' });
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

      if (
        body.rating !== undefined &&
        body.rating !== null &&
        (typeof body.rating !== 'number' ||
          !Number.isInteger(body.rating) ||
          body.rating < 1 ||
          body.rating > 5)
      ) {
        res
          .status(400)
          .json({ success: false, error: 'rating must be an integer between 1 and 5' });
        return;
      }

      const input: CreateVendorInput = {
        name: body.name.trim(),
        phone: body.phone.trim(),
        category: body.category as VendorCategory,
        company: typeof body.company === 'string' ? body.company : null,
        email: typeof body.email === 'string' ? body.email : null,
        website: typeof body.website === 'string' ? body.website : null,
        notes: typeof body.notes === 'string' ? body.notes : '',
        rating: typeof body.rating === 'number' ? body.rating : null,
        lastContactedAt: typeof body.lastContactedAt === 'string' ? body.lastContactedAt : null,
        lastServiceDate: typeof body.lastServiceDate === 'string' ? body.lastServiceDate : null,
        linkedAssetIds: Array.isArray(body.linkedAssetIds) ? (body.linkedAssetIds as string[]) : [],
      };

      const vendor = vendorService.create(input);
      res.status(201).json({ success: true, data: vendor });
    } catch (error) {
      logger.error('Failed to create vendor:', error);
      res.status(500).json({ success: false, error: 'Failed to create vendor' });
    }
  });

  /** GET /vendors */
  router.get('/', (req, res) => {
    try {
      const category = req.query.category as string | undefined;

      if (category && !VALID_CATEGORIES.has(category)) {
        res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
        return;
      }

      const vendors = vendorService.list(
        category ? { category: category as VendorCategory } : undefined
      );
      res.json({ success: true, data: vendors });
    } catch (error) {
      logger.error('Failed to list vendors:', error);
      res.status(500).json({ success: false, error: 'Failed to list vendors' });
    }
  });

  /** GET /vendors/:id */
  router.get('/:id', (req, res) => {
    try {
      const vendor = vendorService.get(req.params.id);
      if (!vendor) {
        res.status(404).json({ success: false, error: `Vendor "${req.params.id}" not found` });
        return;
      }
      res.json({ success: true, data: vendor });
    } catch (error) {
      logger.error('Failed to get vendor:', error);
      res.status(500).json({ success: false, error: 'Failed to get vendor' });
    }
  });

  /** PATCH /vendors/:id */
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

      if (
        body.rating !== undefined &&
        body.rating !== null &&
        (typeof body.rating !== 'number' ||
          !Number.isInteger(body.rating) ||
          body.rating < 1 ||
          body.rating > 5)
      ) {
        res
          .status(400)
          .json({ success: false, error: 'rating must be an integer between 1 and 5' });
        return;
      }

      const changes: UpdateVendorInput = {};

      if (typeof body.name === 'string') changes.name = body.name.trim();
      if (typeof body.phone === 'string') changes.phone = body.phone.trim();
      if (typeof body.category === 'string') changes.category = body.category as VendorCategory;
      if (body.company !== undefined)
        changes.company = typeof body.company === 'string' ? body.company : null;
      if (body.email !== undefined)
        changes.email = typeof body.email === 'string' ? body.email : null;
      if (body.website !== undefined)
        changes.website = typeof body.website === 'string' ? body.website : null;
      if (typeof body.notes === 'string') changes.notes = body.notes;
      if (body.rating !== undefined)
        changes.rating = typeof body.rating === 'number' ? body.rating : null;
      if (body.lastContactedAt !== undefined)
        changes.lastContactedAt =
          typeof body.lastContactedAt === 'string' ? body.lastContactedAt : null;
      if (body.lastServiceDate !== undefined)
        changes.lastServiceDate =
          typeof body.lastServiceDate === 'string' ? body.lastServiceDate : null;
      if (Array.isArray(body.linkedAssetIds))
        changes.linkedAssetIds = body.linkedAssetIds as string[];

      const updated = vendorService.update(req.params.id, changes);
      if (!updated) {
        res.status(404).json({ success: false, error: `Vendor "${req.params.id}" not found` });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Failed to update vendor:', error);
      res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
  });

  /** DELETE /vendors/:id */
  router.delete('/:id', (req, res) => {
    try {
      vendorService.delete(req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      logger.error('Failed to delete vendor:', error);
      res.status(500).json({ success: false, error: 'Failed to delete vendor' });
    }
  });

  return router;
}
