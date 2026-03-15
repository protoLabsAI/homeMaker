/**
 * InventoryService — SQLite-backed home inventory asset tracking.
 *
 * Manages household assets with full CRUD, full-text search, warranty
 * reporting, and per-category value aggregation. Operates on the shared
 * homemaker.db instance; tables and indexes are created idempotently
 * in the constructor.
 *
 * All monetary amounts are stored in cents (integers) to avoid
 * floating-point arithmetic issues.
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  Asset,
  AssetCategory,
  CreateAssetInput,
  UpdateAssetInput,
  WarrantyReport,
  TotalValueReport,
  CategoryValue,
} from '@protolabsai/types';

const logger = createLogger('InventoryService');

/** Optional filters for listing assets */
export interface AssetFilters {
  /** Filter by asset category */
  category?: AssetCategory;
  /** Filter by location (exact match) */
  location?: string;
  /** When true, return only assets whose warranty expires within 30 days */
  warrantyExpiring?: boolean;
}

/** Shape of an asset row as stored in SQLite (JSON arrays are strings) */
interface AssetRow {
  id: string;
  name: string;
  category: string;
  location: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiration: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  manualUrl: string | null;
  replacementCost: number | null;
  notes: string | null;
  sensorIds: string;
  photoUrls: string;
  createdAt: string;
  updatedAt: string;
}

/** Convert a raw SQLite row into a typed Asset, parsing JSON array columns */
function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category as AssetCategory,
    location: row.location ?? '',
    purchaseDate: row.purchaseDate,
    purchasePrice: row.purchasePrice,
    warrantyExpiration: row.warrantyExpiration,
    modelNumber: row.modelNumber,
    serialNumber: row.serialNumber,
    manufacturer: row.manufacturer,
    manualUrl: row.manualUrl,
    replacementCost: row.replacementCost,
    notes: row.notes,
    sensorIds: JSON.parse(row.sensorIds) as string[],
    photoUrls: JSON.parse(row.photoUrls) as string[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class InventoryService {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;
    this.ensureSchema();
  }

  /**
   * Idempotently create the assets table and performance indexes.
   * Safe to call on every startup — uses IF NOT EXISTS throughout.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT,
        purchaseDate TEXT,
        purchasePrice INTEGER,
        warrantyExpiration TEXT,
        modelNumber TEXT,
        serialNumber TEXT,
        manufacturer TEXT,
        manualUrl TEXT,
        replacementCost INTEGER,
        notes TEXT,
        sensorIds TEXT DEFAULT '[]',
        photoUrls TEXT DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
      CREATE INDEX IF NOT EXISTS idx_assets_manufacturer ON assets(manufacturer);
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
      CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location);
    `);
    logger.info('Inventory schema initialized');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Insert a new asset and return the full record */
  create(input: CreateAssetInput): Asset {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO assets (
        id, name, category, location, purchaseDate, purchasePrice,
        warrantyExpiration, modelNumber, serialNumber, manufacturer,
        manualUrl, replacementCost, notes, sensorIds, photoUrls,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name,
      input.category,
      input.location || null,
      input.purchaseDate ?? null,
      input.purchasePrice ?? null,
      input.warrantyExpiration ?? null,
      input.modelNumber ?? null,
      input.serialNumber ?? null,
      input.manufacturer ?? null,
      input.manualUrl ?? null,
      input.replacementCost ?? null,
      input.notes ?? null,
      JSON.stringify(input.sensorIds ?? []),
      JSON.stringify(input.photoUrls ?? []),
      now,
      now
    );

    logger.info(`Asset created: "${input.name}" (${id})`);

    return {
      id,
      name: input.name,
      category: input.category,
      location: input.location ?? '',
      purchaseDate: input.purchaseDate ?? null,
      purchasePrice: input.purchasePrice ?? null,
      warrantyExpiration: input.warrantyExpiration ?? null,
      modelNumber: input.modelNumber ?? null,
      serialNumber: input.serialNumber ?? null,
      manufacturer: input.manufacturer ?? null,
      manualUrl: input.manualUrl ?? null,
      replacementCost: input.replacementCost ?? null,
      notes: input.notes ?? null,
      sensorIds: input.sensorIds ?? [],
      photoUrls: input.photoUrls ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /** List all assets, optionally filtered by category, location, or warranty status */
  list(filters?: AssetFilters): Asset[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters?.location) {
      conditions.push('location = ?');
      params.push(filters.location);
    }

    if (filters?.warrantyExpiring) {
      const now = new Date().toISOString().slice(0, 10);
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      conditions.push(
        'warrantyExpiration IS NOT NULL AND warrantyExpiration >= ? AND warrantyExpiration <= ?'
      );
      params.push(now, thirtyDays);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM assets ${where} ORDER BY name ASC`;

    const rows = this.db.prepare(sql).all(...params) as AssetRow[];
    return rows.map(rowToAsset);
  }

  /** Retrieve a single asset by ID, or null if not found */
  get(id: string): Asset | null {
    const row = this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as
      | AssetRow
      | undefined;
    return row ? rowToAsset(row) : null;
  }

  /** Partially update an asset. Returns the updated record or null if not found. */
  update(id: string, changes: UpdateAssetInput): Asset | null {
    const existing = this.get(id);
    if (!existing) {
      return null;
    }

    const setClauses: string[] = [];
    const params: Array<string | number | null> = [];

    const fieldMap: Record<string, unknown> = { ...changes };

    // Serialize array fields to JSON
    if ('sensorIds' in fieldMap) {
      fieldMap['sensorIds'] = JSON.stringify(fieldMap['sensorIds']);
    }
    if ('photoUrls' in fieldMap) {
      fieldMap['photoUrls'] = JSON.stringify(fieldMap['photoUrls']);
    }

    for (const [key, value] of Object.entries(fieldMap)) {
      setClauses.push(`${key} = ?`);
      params.push((value as string | number | null) ?? null);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    const now = new Date().toISOString();
    setClauses.push('updatedAt = ?');
    params.push(now);
    params.push(id);

    const sql = `UPDATE assets SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);

    logger.info(`Asset updated: ${id}`);
    return this.get(id);
  }

  /** Delete an asset by ID. Throws if not found. */
  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Asset "${id}" not found`);
    }
    logger.info(`Asset deleted: ${id}`);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  /**
   * Full-text search across name, manufacturer, modelNumber, serialNumber,
   * location, and notes. Uses LIKE for broad substring matching.
   */
  search(query: string): Asset[] {
    const pattern = `%${query}%`;
    const sql = `
      SELECT * FROM assets
      WHERE name LIKE ?
         OR manufacturer LIKE ?
         OR modelNumber LIKE ?
         OR serialNumber LIKE ?
         OR location LIKE ?
         OR notes LIKE ?
      ORDER BY name ASC
    `;
    const rows = this.db
      .prepare(sql)
      .all(pattern, pattern, pattern, pattern, pattern, pattern) as AssetRow[];
    return rows.map(rowToAsset);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  /** Group assets by warranty status: active, expiring soon (90 days), expired, no warranty */
  getWarrantyReport(): WarrantyReport {
    const today = new Date().toISOString().slice(0, 10);
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const allRows = this.db.prepare('SELECT * FROM assets ORDER BY name ASC').all() as AssetRow[];
    const allAssets = allRows.map(rowToAsset);

    const report: WarrantyReport = {
      active: [],
      expiringSoon: [],
      expired: [],
      noWarranty: [],
    };

    for (const asset of allAssets) {
      if (!asset.warrantyExpiration) {
        report.noWarranty.push(asset);
      } else if (asset.warrantyExpiration < today) {
        report.expired.push(asset);
      } else if (asset.warrantyExpiration <= ninetyDays) {
        report.expiringSoon.push(asset);
      } else {
        report.active.push(asset);
      }
    }

    return report;
  }

  /** Sum replacementCost for all assets, grouped by category */
  getTotalValue(): TotalValueReport {
    const rows = this.db
      .prepare(
        `SELECT category, COALESCE(SUM(replacementCost), 0) as total, COUNT(*) as count
         FROM assets
         GROUP BY category
         ORDER BY total DESC`
      )
      .all() as Array<{ category: string; total: number; count: number }>;

    let grandTotal = 0;
    const byCategory: CategoryValue[] = rows.map((row) => {
      grandTotal += row.total;
      return {
        category: row.category as AssetCategory,
        totalReplacementCost: row.total,
        assetCount: row.count,
      };
    });

    return {
      totalReplacementCost: grandTotal,
      byCategory,
    };
  }
}
