/**
 * MaintenanceService — SQLite-backed household maintenance schedule tracking.
 *
 * Manages recurring maintenance schedules (e.g. HVAC filter, furnace tune-up)
 * linked to inventory assets and vendors. Provides getUpcoming() and getOverdue()
 * queries used by the daily scheduler tick to auto-generate calendar events
 * and todo items.
 *
 * Operates on the shared homemaker.db instance; tables are created idempotently
 * in the constructor.
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type {
  MaintenanceSchedule,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
} from '@protolabsai/types';

const logger = createLogger('MaintenanceService');

/** Shape of a maintenance_schedules row as stored in SQLite */
interface ScheduleRow {
  id: string;
  title: string;
  description: string | null;
  assetId: string | null;
  assetName: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  estimatedCostCents: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToSchedule(row: ScheduleRow): MaintenanceSchedule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assetId: row.assetId,
    assetName: row.assetName,
    vendorName: row.vendorName,
    vendorPhone: row.vendorPhone,
    intervalDays: row.intervalDays,
    lastCompletedAt: row.lastCompletedAt,
    nextDueAt: row.nextDueAt,
    estimatedCostCents: row.estimatedCostCents,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class MaintenanceService {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;
    this.ensureSchema();
  }

  /**
   * Idempotently create the maintenance_schedules table and indexes.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assetId TEXT,
        assetName TEXT,
        vendorName TEXT,
        vendorPhone TEXT,
        intervalDays INTEGER NOT NULL,
        lastCompletedAt TEXT,
        nextDueAt TEXT NOT NULL,
        estimatedCostCents INTEGER,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_maintenance_nextDueAt ON maintenance_schedules(nextDueAt);
      CREATE INDEX IF NOT EXISTS idx_maintenance_assetId ON maintenance_schedules(assetId);
    `);
    logger.info('Maintenance schema initialized');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Insert a new maintenance schedule and return the full record */
  create(input: CreateMaintenanceScheduleInput): MaintenanceSchedule {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO maintenance_schedules (
          id, title, description, assetId, assetName, vendorName, vendorPhone,
          intervalDays, lastCompletedAt, nextDueAt, estimatedCostCents, notes,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.description ?? null,
        input.assetId ?? null,
        input.assetName ?? null,
        input.vendorName ?? null,
        input.vendorPhone ?? null,
        input.intervalDays,
        input.lastCompletedAt ?? null,
        input.nextDueAt,
        input.estimatedCostCents ?? null,
        input.notes ?? null,
        now,
        now
      );

    logger.info(`Maintenance schedule created: "${input.title}" (${id})`);

    return {
      id,
      title: input.title,
      description: input.description ?? null,
      assetId: input.assetId ?? null,
      assetName: input.assetName ?? null,
      vendorName: input.vendorName ?? null,
      vendorPhone: input.vendorPhone ?? null,
      intervalDays: input.intervalDays,
      lastCompletedAt: input.lastCompletedAt ?? null,
      nextDueAt: input.nextDueAt,
      estimatedCostCents: input.estimatedCostCents ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** List all maintenance schedules ordered by nextDueAt */
  list(): MaintenanceSchedule[] {
    const rows = this.db
      .prepare('SELECT * FROM maintenance_schedules ORDER BY nextDueAt ASC')
      .all() as ScheduleRow[];
    return rows.map(rowToSchedule);
  }

  /** Retrieve a single schedule by ID, or null if not found */
  get(id: string): MaintenanceSchedule | null {
    const row = this.db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(id) as
      | ScheduleRow
      | undefined;
    return row ? rowToSchedule(row) : null;
  }

  /** Partially update a schedule. Returns the updated record or null if not found. */
  update(id: string, changes: UpdateMaintenanceScheduleInput): MaintenanceSchedule | null {
    const existing = this.get(id);
    if (!existing) {
      return null;
    }

    const setClauses: string[] = [];
    const params: Array<string | number | null> = [];

    const fieldMap: Record<string, unknown> = { ...changes };
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

    this.db
      .prepare(`UPDATE maintenance_schedules SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...params);

    logger.info(`Maintenance schedule updated: ${id}`);
    return this.get(id);
  }

  /** Delete a schedule by ID. Throws if not found. */
  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM maintenance_schedules WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Maintenance schedule "${id}" not found`);
    }
    logger.info(`Maintenance schedule deleted: ${id}`);
  }

  // ── Scheduler queries ─────────────────────────────────────────────────────

  /**
   * Return all schedules whose nextDueAt falls within the next `days` days.
   * Used by the daily scheduler tick to create upcoming calendar events.
   */
  getUpcoming(days: number): MaintenanceSchedule[] {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = this.db
      .prepare(
        `SELECT * FROM maintenance_schedules
         WHERE nextDueAt >= ? AND nextDueAt <= ?
         ORDER BY nextDueAt ASC`
      )
      .all(today, future) as ScheduleRow[];

    return rows.map(rowToSchedule);
  }

  /**
   * Return all schedules whose nextDueAt is before today.
   * Used by the daily scheduler tick to create overdue todo items.
   */
  getOverdue(): MaintenanceSchedule[] {
    const today = new Date().toISOString().slice(0, 10);

    const rows = this.db
      .prepare(
        `SELECT * FROM maintenance_schedules
         WHERE nextDueAt < ?
         ORDER BY nextDueAt ASC`
      )
      .all(today) as ScheduleRow[];

    return rows.map(rowToSchedule);
  }
}
