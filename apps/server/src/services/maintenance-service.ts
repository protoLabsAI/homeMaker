/**
 * MaintenanceService — SQLite-backed recurring maintenance scheduling.
 *
 * Manages maintenance schedules with configurable intervals, tracks
 * completion history, and provides due-date summaries. Links to optional
 * asset and vendor records via LEFT JOIN (those tables may or may not exist).
 *
 * Operates on the shared homemaker.db instance; tables and indexes are
 * created idempotently in the constructor. All timestamps are stored as
 * ISO-8601 strings.
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  MaintenanceSchedule,
  MaintenanceCompletion,
  MaintenanceCategory,
  MaintenanceDueSummary,
  MaintenanceListFilters,
} from '@protolabsai/types';

const logger = createLogger('MaintenanceService');

/** Input for creating a new maintenance schedule */
export interface CreateMaintenanceInput {
  title: string;
  description?: string | null;
  intervalDays: number;
  nextDueAt?: string;
  assetId?: string | null;
  category: MaintenanceCategory;
  estimatedCostUsd?: number | null;
  vendorId?: string | null;
  completedById?: string | null;
}

/** Input for updating an existing maintenance schedule */
export interface UpdateMaintenanceInput {
  title?: string;
  description?: string | null;
  intervalDays?: number;
  nextDueAt?: string;
  assetId?: string | null;
  category?: MaintenanceCategory;
  estimatedCostUsd?: number | null;
  vendorId?: string | null;
  completedById?: string | null;
}

/** Input for recording a completion event */
export interface CompleteMaintenanceInput {
  completedBy: string;
  completedAt?: string;
  notes?: string | null;
  actualCostUsd?: number | null;
}

/** Row shape returned by SQLite for schedule queries (without JOINs) */
interface ScheduleRow {
  id: string;
  title: string;
  description: string | null;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  assetId: string | null;
  category: string;
  estimatedCostUsd: number | null;
  vendorId: string | null;
  completedById: string | null;
  createdAt: string;
  updatedAt: string;
  assetName?: string | null;
  vendorName?: string | null;
}

/** Row shape returned by SQLite for completion queries */
interface CompletionRow {
  id: string;
  scheduleId: string;
  completedAt: string;
  completedBy: string;
  notes: string | null;
  actualCostUsd: number | null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toSchedule(row: ScheduleRow): MaintenanceSchedule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    intervalDays: row.intervalDays,
    lastCompletedAt: row.lastCompletedAt,
    nextDueAt: row.nextDueAt,
    assetId: row.assetId,
    category: row.category as MaintenanceCategory,
    estimatedCostUsd: row.estimatedCostUsd,
    vendorId: row.vendorId,
    completedById: row.completedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assetName: row.assetName ?? null,
    vendorName: row.vendorName ?? null,
  };
}

function toCompletion(row: CompletionRow): MaintenanceCompletion {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    notes: row.notes,
    actualCostUsd: row.actualCostUsd,
  };
}

export class MaintenanceService {
  private db: BetterSqlite3.Database;
  private joinSupported: boolean = false;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;
    this.ensureSchema();
    this.detectJoinSupport();
  }

  /**
   * Idempotently create the maintenance tables and indexes.
   * Safe to call on every startup — uses IF NOT EXISTS throughout.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        intervalDays INTEGER NOT NULL,
        lastCompletedAt TEXT,
        nextDueAt TEXT NOT NULL,
        assetId TEXT,
        category TEXT NOT NULL,
        estimatedCostUsd REAL,
        vendorId TEXT,
        completedById TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_maintenance_nextDueAt ON maintenance(nextDueAt);

      CREATE TABLE IF NOT EXISTS maintenance_completions (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL REFERENCES maintenance(id),
        completedAt TEXT NOT NULL,
        completedBy TEXT NOT NULL,
        notes TEXT,
        actualCostUsd REAL,
        FOREIGN KEY (scheduleId) REFERENCES maintenance(id)
      );

      CREATE INDEX IF NOT EXISTS idx_maintenance_completions_scheduleId ON maintenance_completions(scheduleId);
    `);
    logger.info('Maintenance schema initialized');
  }

  /**
   * Check whether the assets and vendors tables exist so we can use
   * LEFT JOINs for name resolution. If either table is missing we
   * fall back to plain SELECT from maintenance only.
   */
  private detectJoinSupport(): void {
    try {
      const assetsExists = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assets'")
        .get();
      const vendorsExists = this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vendors'")
        .get();
      this.joinSupported = !!(assetsExists && vendorsExists);
    } catch {
      this.joinSupported = false;
    }
  }

  /** Build a SELECT with optional LEFT JOINs for asset/vendor names */
  private selectWithJoins(whereClause: string = ''): string {
    if (this.joinSupported) {
      return `
        SELECT m.*,
               a.name AS assetName,
               v.name AS vendorName
        FROM maintenance m
        LEFT JOIN assets a ON m.assetId = a.id
        LEFT JOIN vendors v ON m.vendorId = v.id
        ${whereClause}
      `;
    }
    return `SELECT * FROM maintenance ${whereClause}`;
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  create(input: CreateMaintenanceInput): MaintenanceSchedule {
    const id = randomUUID();
    const now = new Date().toISOString();
    const nextDueAt = input.nextDueAt ?? addDays(new Date(), input.intervalDays).toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO maintenance
        (id, title, description, intervalDays, lastCompletedAt, nextDueAt, assetId, category, estimatedCostUsd, vendorId, completedById, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.description ?? null,
      input.intervalDays,
      null,
      nextDueAt,
      input.assetId ?? null,
      input.category,
      input.estimatedCostUsd ?? null,
      input.vendorId ?? null,
      input.completedById ?? null,
      now,
      now
    );

    logger.info(`Schedule created: "${input.title}" (${id})`);

    // Re-read with JOINs for asset/vendor names
    return this.get(id)!;
  }

  // ── List ────────────────────────────────────────────────────────────────────

  list(filters?: MaintenanceListFilters): MaintenanceSchedule[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    const now = new Date().toISOString();
    const prefix = this.joinSupported ? 'm.' : '';

    if (filters?.category) {
      conditions.push(`${prefix}category = ?`);
      params.push(filters.category);
    }
    if (filters?.assetId) {
      conditions.push(`${prefix}assetId = ?`);
      params.push(filters.assetId);
    }
    if (filters?.overdue) {
      conditions.push(`${prefix}nextDueAt < ?`);
      params.push(now);
    }
    if (filters?.upcoming != null) {
      const cutoff = addDays(new Date(), filters.upcoming).toISOString();
      conditions.push(`${prefix}nextDueAt <= ?`);
      params.push(cutoff);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY ${prefix}nextDueAt ASC`;
    const sql = this.selectWithJoins(`${where} ${orderBy}`);

    const rows = this.db.prepare(sql).all(...params) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  // ── Get ─────────────────────────────────────────────────────────────────────

  get(id: string): MaintenanceSchedule | null {
    const prefix = this.joinSupported ? 'm.' : '';
    const sql = this.selectWithJoins(`WHERE ${prefix}id = ?`);
    const row = this.db.prepare(sql).get(id) as ScheduleRow | undefined;

    if (!row) return null;
    return toSchedule(row);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(id: string, input: UpdateMaintenanceInput): MaintenanceSchedule | null {
    const existing = this.get(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const title = input.title ?? existing.title;
    const description = input.description !== undefined ? input.description : existing.description;
    const intervalDays = input.intervalDays ?? existing.intervalDays;
    const assetId = input.assetId !== undefined ? input.assetId : existing.assetId;
    const category = input.category ?? existing.category;
    const estimatedCostUsd =
      input.estimatedCostUsd !== undefined ? input.estimatedCostUsd : existing.estimatedCostUsd;
    const vendorId = input.vendorId !== undefined ? input.vendorId : existing.vendorId;
    const completedById =
      input.completedById !== undefined ? input.completedById : existing.completedById;

    // Recalculate nextDueAt if intervalDays changed and no explicit nextDueAt provided
    let nextDueAt = input.nextDueAt ?? existing.nextDueAt;
    if (
      input.intervalDays != null &&
      input.intervalDays !== existing.intervalDays &&
      !input.nextDueAt
    ) {
      const base = existing.lastCompletedAt
        ? new Date(existing.lastCompletedAt)
        : new Date(existing.createdAt);
      nextDueAt = addDays(base, input.intervalDays).toISOString();
    }

    const stmt = this.db.prepare(`
      UPDATE maintenance
      SET title = ?, description = ?, intervalDays = ?, nextDueAt = ?,
          assetId = ?, category = ?, estimatedCostUsd = ?, vendorId = ?,
          completedById = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(
      title,
      description,
      intervalDays,
      nextDueAt,
      assetId,
      category,
      estimatedCostUsd,
      vendorId,
      completedById,
      now,
      id
    );

    logger.info(`Schedule updated: ${id}`);

    // Re-read with JOINs for updated asset/vendor names
    return this.get(id);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  delete(id: string): boolean {
    // Delete completions first (no ON DELETE CASCADE since we use a separate table reference)
    this.db.prepare('DELETE FROM maintenance_completions WHERE scheduleId = ?').run(id);
    const result = this.db.prepare('DELETE FROM maintenance WHERE id = ?').run(id);
    if (result.changes === 0) {
      return false;
    }
    logger.info(`Schedule deleted: ${id}`);
    return true;
  }

  // ── Complete ────────────────────────────────────────────────────────────────

  complete(
    scheduleId: string,
    input: CompleteMaintenanceInput
  ): { schedule: MaintenanceSchedule; completion: MaintenanceCompletion } {
    const existing = this.get(scheduleId);
    if (!existing) {
      throw new Error(`Schedule "${scheduleId}" not found`);
    }

    const completionId = randomUUID();
    const completedAt = input.completedAt ?? new Date().toISOString();
    const now = new Date().toISOString();

    // Insert completion record
    this.db
      .prepare(
        `INSERT INTO maintenance_completions (id, scheduleId, completedAt, completedBy, notes, actualCostUsd)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        completionId,
        scheduleId,
        completedAt,
        input.completedBy,
        input.notes ?? null,
        input.actualCostUsd ?? null
      );

    // Update schedule: advance lastCompletedAt and nextDueAt
    const nextDueAt = addDays(new Date(completedAt), existing.intervalDays).toISOString();
    this.db
      .prepare(
        `UPDATE maintenance
         SET lastCompletedAt = ?, nextDueAt = ?, updatedAt = ?
         WHERE id = ?`
      )
      .run(completedAt, nextDueAt, now, scheduleId);

    logger.info(`Schedule completed: ${scheduleId} by ${input.completedBy}`);

    const completion: MaintenanceCompletion = {
      id: completionId,
      scheduleId,
      completedAt,
      completedBy: input.completedBy,
      notes: input.notes ?? null,
      actualCostUsd: input.actualCostUsd ?? null,
    };

    return {
      schedule: this.get(scheduleId)!,
      completion,
    };
  }

  // ── Overdue & Upcoming ──────────────────────────────────────────────────────

  getOverdue(): MaintenanceSchedule[] {
    const now = new Date().toISOString();
    const prefix = this.joinSupported ? 'm.' : '';
    const sql = this.selectWithJoins(
      `WHERE ${prefix}nextDueAt < ? ORDER BY ${prefix}nextDueAt ASC`
    );
    const rows = this.db.prepare(sql).all(now) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  getUpcoming(days: number): MaintenanceSchedule[] {
    const now = new Date().toISOString();
    const cutoff = addDays(new Date(), days).toISOString();
    const prefix = this.joinSupported ? 'm.' : '';
    const sql = this.selectWithJoins(
      `WHERE ${prefix}nextDueAt >= ? AND ${prefix}nextDueAt <= ? ORDER BY ${prefix}nextDueAt ASC`
    );
    const rows = this.db.prepare(sql).all(now, cutoff) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  getDueSummary(): MaintenanceDueSummary {
    const now = new Date();
    const nowIso = now.toISOString();

    const endOfWeek = addDays(now, 7).toISOString();
    const endOfMonth = addDays(now, 30).toISOString();

    const overdueCount = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM maintenance WHERE nextDueAt < ?')
        .get(nowIso) as { count: number }
    ).count;

    const dueThisWeekCount = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM maintenance WHERE nextDueAt >= ? AND nextDueAt <= ?'
        )
        .get(nowIso, endOfWeek) as { count: number }
    ).count;

    const dueThisMonthCount = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM maintenance WHERE nextDueAt >= ? AND nextDueAt <= ?'
        )
        .get(nowIso, endOfMonth) as { count: number }
    ).count;

    const totalCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM maintenance').get() as {
        count: number;
      }
    ).count;

    const upToDate = totalCount - overdueCount;

    return {
      overdue: overdueCount,
      dueThisWeek: dueThisWeekCount,
      dueThisMonth: dueThisMonthCount,
      upToDate,
    };
  }

  // ── Completion History ──────────────────────────────────────────────────────

  getCompletions(scheduleId: string): MaintenanceCompletion[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM maintenance_completions WHERE scheduleId = ? ORDER BY completedAt DESC'
      )
      .all(scheduleId) as CompletionRow[];
    return rows.map(toCompletion);
  }
}
