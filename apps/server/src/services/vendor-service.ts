/**
 * VendorService — SQLite-backed vendor/contractor directory.
 *
 * Manages home service providers with full CRUD, search, category filtering,
 * and asset-linked lookups. Operates on the shared homemaker.db instance;
 * the table and indexes are created idempotently in the constructor.
 *
 * Phone numbers are stored as strings to preserve formatting.
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  Vendor,
  VendorCategory,
  CreateVendorInput,
  UpdateVendorInput,
  VendorFilters,
} from '@protolabsai/types';

const logger = createLogger('VendorService');

/** Shape of a vendor row as stored in SQLite (JSON arrays are strings) */
interface VendorRow {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  category: string;
  notes: string;
  rating: number | null;
  lastContactedAt: string | null;
  lastServiceDate: string | null;
  linkedAssetIds: string;
  createdAt: string;
  updatedAt: string;
}

/** Convert a raw SQLite row into a typed Vendor, parsing JSON array columns */
function rowToVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    website: row.website,
    category: row.category as VendorCategory,
    notes: row.notes,
    rating: row.rating,
    lastContactedAt: row.lastContactedAt,
    lastServiceDate: row.lastServiceDate,
    linkedAssetIds: JSON.parse(row.linkedAssetIds) as string[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class VendorService {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;
    this.ensureSchema();
  }

  /**
   * Idempotently create the vendors table and performance indexes.
   * Safe to call on every startup — uses IF NOT EXISTS throughout.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        website TEXT,
        category TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        rating INTEGER,
        lastContactedAt TEXT,
        lastServiceDate TEXT,
        linkedAssetIds TEXT NOT NULL DEFAULT '[]',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
      CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
    `);
    logger.info('Vendor schema initialized');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Insert a new vendor and return the full record */
  create(input: CreateVendorInput): Vendor {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO vendors (
        id, name, company, phone, email, website, category,
        notes, rating, lastContactedAt, lastServiceDate,
        linkedAssetIds, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name,
      input.company ?? null,
      input.phone,
      input.email ?? null,
      input.website ?? null,
      input.category,
      input.notes ?? '',
      input.rating ?? null,
      input.lastContactedAt ?? null,
      input.lastServiceDate ?? null,
      JSON.stringify(input.linkedAssetIds ?? []),
      now,
      now
    );

    logger.info(`Vendor created: "${input.name}" (${id})`);

    return {
      id,
      name: input.name,
      company: input.company ?? null,
      phone: input.phone,
      email: input.email ?? null,
      website: input.website ?? null,
      category: input.category,
      notes: input.notes ?? '',
      rating: input.rating ?? null,
      lastContactedAt: input.lastContactedAt ?? null,
      lastServiceDate: input.lastServiceDate ?? null,
      linkedAssetIds: input.linkedAssetIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /** List all vendors, optionally filtered by category */
  list(filters?: VendorFilters): Vendor[] {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters?.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM vendors ${where} ORDER BY name ASC`;

    const rows = this.db.prepare(sql).all(...params) as VendorRow[];
    return rows.map(rowToVendor);
  }

  /** Retrieve a single vendor by ID, or null if not found */
  get(id: string): Vendor | null {
    const row = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as
      | VendorRow
      | undefined;
    return row ? rowToVendor(row) : null;
  }

  /** Partially update a vendor. Returns the updated record or null if not found. */
  update(id: string, changes: UpdateVendorInput): Vendor | null {
    const existing = this.get(id);
    if (!existing) {
      return null;
    }

    const setClauses: string[] = [];
    const params: Array<string | number | null> = [];

    const fieldMap: Record<string, unknown> = { ...changes };

    // Serialize array fields to JSON
    if ('linkedAssetIds' in fieldMap) {
      fieldMap['linkedAssetIds'] = JSON.stringify(fieldMap['linkedAssetIds']);
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

    const sql = `UPDATE vendors SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);

    logger.info(`Vendor updated: ${id}`);
    return this.get(id);
  }

  /** Delete a vendor by ID. Throws if not found. */
  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM vendors WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Vendor "${id}" not found`);
    }
    logger.info(`Vendor deleted: ${id}`);
  }

  // ── Search & Filters ──────────────────────────────────────────────────────

  /**
   * Full-text search across name, company, notes, and category.
   * Uses LIKE for broad substring matching.
   */
  search(query: string): Vendor[] {
    const pattern = `%${query}%`;
    const sql = `
      SELECT * FROM vendors
      WHERE name LIKE ?
         OR company LIKE ?
         OR notes LIKE ?
         OR category LIKE ?
      ORDER BY name ASC
    `;
    const rows = this.db.prepare(sql).all(pattern, pattern, pattern, pattern) as VendorRow[];
    return rows.map(rowToVendor);
  }

  /** Return all vendors in a specific trade category */
  listByCategory(category: VendorCategory): Vendor[] {
    const rows = this.db
      .prepare('SELECT * FROM vendors WHERE category = ? ORDER BY name ASC')
      .all(category) as VendorRow[];
    return rows.map(rowToVendor);
  }

  /** Return all vendors whose linkedAssetIds include the given asset ID */
  getForAsset(assetId: string): Vendor[] {
    // SQLite JSON functions require a pattern match; use LIKE on the JSON string
    const pattern = `%"${assetId}"%`;
    const rows = this.db
      .prepare('SELECT * FROM vendors WHERE linkedAssetIds LIKE ? ORDER BY name ASC')
      .all(pattern) as VendorRow[];
    return rows.map(rowToVendor);
  }
}
