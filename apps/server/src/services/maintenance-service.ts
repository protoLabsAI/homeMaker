/**
 * MaintenanceService — SQLite-backed recurring maintenance scheduling.
 *
 * Manages maintenance schedules with configurable intervals, tracks
 * completion history, and provides due-date summaries. Links to optional
 * asset and vendor records via LEFT JOIN (those tables may or may not exist).
 *
 * Tables are created automatically on first instantiation. All timestamps
 * are stored as ISO-8601 strings.
 */

import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
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

/** Row shape returned by SQLite for schedule queries */
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

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, 'maintenance.db');
    logger.info(`Opening maintenance database at ${dbPath}`);

    this.db = new BetterSqlite3.default(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
  }

  /** Create schema if it does not already exist */
  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
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

      CREATE TABLE IF NOT EXISTS maintenance_completions (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        completedAt TEXT NOT NULL,
        completedBy TEXT NOT NULL,
        notes TEXT,
        actualCostUsd REAL,
        FOREIGN KEY (scheduleId) REFERENCES maintenance_schedules(id) ON DELETE CASCADE
      );
    `);
    logger.info('Maintenance tables initialized');
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  create(input: CreateMaintenanceInput): MaintenanceSchedule {
    const id = randomUUID();
    const now = new Date().toISOString();
    const nextDueAt = input.nextDueAt ?? addDays(new Date(), input.intervalDays).toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO maintenance_schedules
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

    return {
      id,
      title: input.title,
      description: input.description ?? null,
      intervalDays: input.intervalDays,
      lastCompletedAt: null,
      nextDueAt,
      assetId: input.assetId ?? null,
      category: input.category,
      estimatedCostUsd: input.estimatedCostUsd ?? null,
      vendorId: input.vendorId ?? null,
      completedById: input.completedById ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ── List ────────────────────────────────────────────────────────────────────

  list(filters?: MaintenanceListFilters): MaintenanceSchedule[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    const now = new Date().toISOString();

    if (filters?.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters?.assetId) {
      conditions.push('assetId = ?');
      params.push(filters.assetId);
    }
    if (filters?.overdue) {
      conditions.push('nextDueAt < ?');
      params.push(now);
    }
    if (filters?.upcoming != null) {
      const cutoff = addDays(new Date(), filters.upcoming).toISOString();
      conditions.push('nextDueAt <= ?');
      params.push(cutoff);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM maintenance_schedules ${where} ORDER BY nextDueAt ASC`;

    const rows = this.db.prepare(sql).all(...params) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  // ── Get ─────────────────────────────────────────────────────────────────────

  get(id: string): MaintenanceSchedule | null {
    const row = this.db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(id) as
      | ScheduleRow
      | undefined;

    if (!row) return null;
    return toSchedule(row);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(id: string, input: UpdateMaintenanceInput): MaintenanceSchedule {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Schedule "${id}" not found`);
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
      const base = existing.lastCompletedAt ? new Date(existing.lastCompletedAt) : new Date();
      nextDueAt = addDays(base, input.intervalDays).toISOString();
    }

    const stmt = this.db.prepare(`
      UPDATE maintenance_schedules
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

    return {
      ...existing,
      title,
      description,
      intervalDays,
      nextDueAt,
      assetId,
      category,
      estimatedCostUsd,
      vendorId,
      completedById,
      updatedAt: now,
    };
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM maintenance_schedules WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Schedule "${id}" not found`);
    }
    // Completions are removed via ON DELETE CASCADE
    logger.info(`Schedule deleted: ${id}`);
  }

  // ── Complete ────────────────────────────────────────────────────────────────

  complete(scheduleId: string, input: CompleteMaintenanceInput): MaintenanceCompletion {
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
        `UPDATE maintenance_schedules
         SET lastCompletedAt = ?, nextDueAt = ?, updatedAt = ?
         WHERE id = ?`
      )
      .run(completedAt, nextDueAt, now, scheduleId);

    logger.info(`Schedule completed: ${scheduleId} by ${input.completedBy}`);

    return {
      id: completionId,
      scheduleId,
      completedAt,
      completedBy: input.completedBy,
      notes: input.notes ?? null,
      actualCostUsd: input.actualCostUsd ?? null,
    };
  }

  // ── Overdue & Upcoming ──────────────────────────────────────────────────────

  getOverdue(): MaintenanceSchedule[] {
    const now = new Date().toISOString();
    const rows = this.db
      .prepare('SELECT * FROM maintenance_schedules WHERE nextDueAt < ? ORDER BY nextDueAt ASC')
      .all(now) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  getUpcoming(days: number): MaintenanceSchedule[] {
    const now = new Date().toISOString();
    const cutoff = addDays(new Date(), days).toISOString();
    const rows = this.db
      .prepare(
        'SELECT * FROM maintenance_schedules WHERE nextDueAt >= ? AND nextDueAt <= ? ORDER BY nextDueAt ASC'
      )
      .all(now, cutoff) as ScheduleRow[];
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
        .prepare('SELECT COUNT(*) as count FROM maintenance_schedules WHERE nextDueAt < ?')
        .get(nowIso) as { count: number }
    ).count;

    const dueThisWeekCount = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM maintenance_schedules WHERE nextDueAt >= ? AND nextDueAt <= ?'
        )
        .get(nowIso, endOfWeek) as { count: number }
    ).count;

    const dueThisMonthCount = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM maintenance_schedules WHERE nextDueAt >= ? AND nextDueAt <= ?'
        )
        .get(nowIso, endOfMonth) as { count: number }
    ).count;

    const totalCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM maintenance_schedules').get() as {
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

  /** Close the database connection (for clean shutdown) */
  close(): void {
    this.db.close();
    logger.info('Maintenance database closed');
  }
}
