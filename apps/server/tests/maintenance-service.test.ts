/**
 * Unit tests for MaintenanceService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import {
  MaintenanceService,
  type CreateMaintenanceInput,
} from '../src/services/maintenance-service.js';

function createTestDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/** Helper: return an ISO string N days from now */
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

/** Helper: return an ISO string N days in the past */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const BASE_INPUT: CreateMaintenanceInput = {
  title: 'Replace HVAC Filter',
  description: 'Change the air filter monthly',
  intervalDays: 30,
  category: 'hvac',
};

describe('MaintenanceService', () => {
  let db: BetterSqlite3.Database;
  let service: MaintenanceService;

  beforeEach(() => {
    db = createTestDb();
    service = new MaintenanceService(db);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('creates a schedule with required fields', () => {
    const schedule = service.create(BASE_INPUT);
    expect(schedule.id).toBeTruthy();
    expect(schedule.title).toBe('Replace HVAC Filter');
    expect(schedule.category).toBe('hvac');
    expect(schedule.intervalDays).toBe(30);
    expect(schedule.createdAt).toBeTruthy();
    expect(schedule.updatedAt).toBeTruthy();
    expect(schedule.lastCompletedAt).toBeNull();
  });

  it('auto-calculates nextDueAt from intervalDays when not provided', () => {
    const before = Date.now();
    const schedule = service.create({ ...BASE_INPUT, intervalDays: 7 });
    const after = Date.now();

    const nextDue = new Date(schedule.nextDueAt).getTime();
    // Should be approximately 7 days from now (within a few ms)
    expect(nextDue).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(nextDue).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000 + 1000);
  });

  it('uses provided nextDueAt when specified', () => {
    const customDate = daysFromNow(14);
    const schedule = service.create({ ...BASE_INPUT, nextDueAt: customDate });
    expect(schedule.nextDueAt).toBe(customDate);
  });

  it('persists the schedule to the database', () => {
    const created = service.create(BASE_INPUT);
    const fetched = service.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.title).toBe('Replace HVAC Filter');
  });

  it('stores optional fields as null when not provided', () => {
    const schedule = service.create(BASE_INPUT);
    expect(schedule.description).toBe('Change the air filter monthly');
    expect(schedule.assetId).toBeNull();
    expect(schedule.vendorId).toBeNull();
    expect(schedule.estimatedCostUsd).toBeNull();
  });

  // ── list ──────────────────────────────────────────────────────────────────

  it('lists all schedules ordered by nextDueAt ascending', () => {
    service.create({ ...BASE_INPUT, title: 'B', nextDueAt: daysFromNow(10) });
    service.create({ ...BASE_INPUT, title: 'A', nextDueAt: daysFromNow(2) });
    service.create({ ...BASE_INPUT, title: 'C', nextDueAt: daysFromNow(20) });

    const list = service.list();
    expect(list).toHaveLength(3);
    expect(list[0]?.title).toBe('A');
    expect(list[1]?.title).toBe('B');
    expect(list[2]?.title).toBe('C');
  });

  it('filters by category', () => {
    service.create({ ...BASE_INPUT, category: 'hvac' });
    service.create({ ...BASE_INPUT, title: 'Check Pipes', category: 'plumbing' });
    service.create({ ...BASE_INPUT, title: 'Check Wires', category: 'electrical' });

    const hvacOnly = service.list({ category: 'hvac' });
    expect(hvacOnly).toHaveLength(1);
    expect(hvacOnly[0]?.category).toBe('hvac');
  });

  it('filters overdue schedules', () => {
    service.create({ ...BASE_INPUT, title: 'Past Due', nextDueAt: daysAgo(5) });
    service.create({ ...BASE_INPUT, title: 'Not Due Yet', nextDueAt: daysFromNow(5) });

    const overdue = service.list({ overdue: true });
    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.title).toBe('Past Due');
  });

  it('filters upcoming schedules within N days', () => {
    service.create({ ...BASE_INPUT, title: 'Due In 3 Days', nextDueAt: daysFromNow(3) });
    service.create({ ...BASE_INPUT, title: 'Due In 15 Days', nextDueAt: daysFromNow(15) });

    const upcoming = service.list({ upcoming: 7 });
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.title).toBe('Due In 3 Days');
  });

  // ── get ───────────────────────────────────────────────────────────────────

  it('returns null for non-existent schedule', () => {
    expect(service.get('not-a-real-id')).toBeNull();
  });

  it('retrieves a schedule by id', () => {
    const created = service.create(BASE_INPUT);
    const fetched = service.get(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.title).toBe('Replace HVAC Filter');
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('returns null when updating non-existent schedule', () => {
    expect(service.update('ghost-id', { title: 'New Title' })).toBeNull();
  });

  it('updates title and description', () => {
    const created = service.create(BASE_INPUT);
    const updated = service.update(created.id, {
      title: 'Updated Title',
      description: 'Updated desc',
    });
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.description).toBe('Updated desc');
  });

  it('recalculates nextDueAt when intervalDays changes without explicit nextDueAt', () => {
    const created = service.create({ ...BASE_INPUT, intervalDays: 30 });
    const updated = service.update(created.id, { intervalDays: 60 });

    // nextDueAt should now be ~60 days from creation (createdAt as base since no completions)
    const nextDue = new Date(updated!.nextDueAt).getTime();
    const createdAt = new Date(created.createdAt).getTime();
    const diff = nextDue - createdAt;
    const expectedDiff = 60 * 24 * 60 * 60 * 1000;
    expect(Math.abs(diff - expectedDiff)).toBeLessThan(5000);
  });

  it('respects explicit nextDueAt on intervalDays change', () => {
    const created = service.create(BASE_INPUT);
    const customDate = daysFromNow(90);
    const updated = service.update(created.id, { intervalDays: 60, nextDueAt: customDate });
    expect(updated?.nextDueAt).toBe(customDate);
  });

  it('clears optional fields with null', () => {
    const created = service.create({ ...BASE_INPUT, description: 'Some description' });
    const updated = service.update(created.id, { description: null });
    expect(updated?.description).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('deletes a schedule and returns true', () => {
    const created = service.create(BASE_INPUT);
    const deleted = service.delete(created.id);
    expect(deleted).toBe(true);
    expect(service.get(created.id)).toBeNull();
  });

  it('returns false when deleting non-existent schedule', () => {
    expect(service.delete('phantom-id')).toBe(false);
  });

  it('also deletes associated completions', () => {
    const created = service.create(BASE_INPUT);
    service.complete(created.id, { completedBy: 'test-user' });

    service.delete(created.id);

    // Completions should be gone too
    const completions = service.getCompletions(created.id);
    expect(completions).toHaveLength(0);
  });

  // ── complete ──────────────────────────────────────────────────────────────

  it('records completion and advances nextDueAt', () => {
    const created = service.create({ ...BASE_INPUT, intervalDays: 30 });
    const completedAt = new Date().toISOString();

    const { schedule, completion } = service.complete(created.id, {
      completedBy: 'alice',
      completedAt,
    });

    expect(completion.completedBy).toBe('alice');
    expect(completion.completedAt).toBe(completedAt);
    expect(schedule.lastCompletedAt).toBe(completedAt);

    // nextDueAt = completedAt + 30 days
    const expectedNext = new Date(
      new Date(completedAt).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(new Date(schedule.nextDueAt).getTime()).toBeCloseTo(
      new Date(expectedNext).getTime(),
      -3
    );
  });

  it('uses current time as completedAt when not provided', () => {
    const before = Date.now();
    const created = service.create(BASE_INPUT);
    const { completion } = service.complete(created.id, { completedBy: 'bob' });
    const after = Date.now();

    const completedTime = new Date(completion.completedAt).getTime();
    expect(completedTime).toBeGreaterThanOrEqual(before);
    expect(completedTime).toBeLessThanOrEqual(after);
  });

  it('stores notes and actualCostUsd in completion', () => {
    const created = service.create(BASE_INPUT);
    const { completion } = service.complete(created.id, {
      completedBy: 'charlie',
      notes: 'Replaced with HEPA filter',
      actualCostUsd: 24.99,
    });

    expect(completion.notes).toBe('Replaced with HEPA filter');
    expect(completion.actualCostUsd).toBe(24.99);
  });

  it('throws when completing a non-existent schedule', () => {
    expect(() => service.complete('ghost-schedule', { completedBy: 'dave' })).toThrow(/not found/);
  });

  it('nextDueAt advances correctly on second completion', () => {
    const created = service.create({ ...BASE_INPUT, intervalDays: 10 });

    const first = new Date('2025-01-01T12:00:00Z').toISOString();
    service.complete(created.id, { completedBy: 'eve', completedAt: first });

    const second = new Date('2025-01-11T12:00:00Z').toISOString();
    const { schedule } = service.complete(created.id, { completedBy: 'eve', completedAt: second });

    // nextDueAt should be second + 10 days
    const expectedNext = new Date('2025-01-21T12:00:00Z').getTime();
    expect(new Date(schedule.nextDueAt).getTime()).toBeCloseTo(expectedNext, -3);
  });

  // ── getOverdue ────────────────────────────────────────────────────────────

  it('returns only overdue schedules', () => {
    service.create({ ...BASE_INPUT, title: 'Overdue', nextDueAt: daysAgo(2) });
    service.create({ ...BASE_INPUT, title: 'On Time', nextDueAt: daysFromNow(2) });

    const overdue = service.getOverdue();
    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.title).toBe('Overdue');
  });

  it('returns empty array when nothing is overdue', () => {
    service.create({ ...BASE_INPUT, nextDueAt: daysFromNow(5) });
    expect(service.getOverdue()).toHaveLength(0);
  });

  // ── getUpcoming ───────────────────────────────────────────────────────────

  it('returns schedules due within the specified day window', () => {
    service.create({ ...BASE_INPUT, title: 'In 3 days', nextDueAt: daysFromNow(3) });
    service.create({ ...BASE_INPUT, title: 'In 15 days', nextDueAt: daysFromNow(15) });

    const upcoming = service.getUpcoming(7);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.title).toBe('In 3 days');
  });

  it('does not include overdue schedules in getUpcoming', () => {
    service.create({ ...BASE_INPUT, title: 'Already Overdue', nextDueAt: daysAgo(1) });
    service.create({ ...BASE_INPUT, title: 'In 2 days', nextDueAt: daysFromNow(2) });

    const upcoming = service.getUpcoming(7);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.title).toBe('In 2 days');
  });

  // ── getDueSummary ─────────────────────────────────────────────────────────

  it('returns correct summary counts', () => {
    service.create({ ...BASE_INPUT, title: 'Overdue 1', nextDueAt: daysAgo(3) });
    service.create({ ...BASE_INPUT, title: 'Overdue 2', nextDueAt: daysAgo(1) });
    service.create({ ...BASE_INPUT, title: 'Due This Week', nextDueAt: daysFromNow(5) });
    service.create({ ...BASE_INPUT, title: 'Due This Month', nextDueAt: daysFromNow(20) });
    service.create({ ...BASE_INPUT, title: 'Way Out', nextDueAt: daysFromNow(60) });

    const summary = service.getDueSummary();
    expect(summary.overdue).toBe(2);
    expect(summary.dueThisWeek).toBe(1); // only the 5-day task
    expect(summary.dueThisMonth).toBe(2); // both the 5-day AND the 20-day task (within 30 days)
    expect(summary.upToDate).toBe(3); // total - overdue = 5 - 2
  });

  it('returns all zeros on empty database', () => {
    const summary = service.getDueSummary();
    expect(summary.overdue).toBe(0);
    expect(summary.dueThisWeek).toBe(0);
    expect(summary.dueThisMonth).toBe(0);
    expect(summary.upToDate).toBe(0);
  });

  // ── getCompletions ────────────────────────────────────────────────────────

  it('returns completion history in descending order', () => {
    const schedule = service.create(BASE_INPUT);

    service.complete(schedule.id, {
      completedBy: 'user',
      completedAt: '2025-01-01T00:00:00Z',
    });
    service.complete(schedule.id, {
      completedBy: 'user',
      completedAt: '2025-02-01T00:00:00Z',
    });

    const completions = service.getCompletions(schedule.id);
    expect(completions).toHaveLength(2);
    // Most recent first
    expect(completions[0]?.completedAt).toBe('2025-02-01T00:00:00Z');
    expect(completions[1]?.completedAt).toBe('2025-01-01T00:00:00Z');
  });

  it('returns empty array for schedule with no completions', () => {
    const schedule = service.create(BASE_INPUT);
    expect(service.getCompletions(schedule.id)).toHaveLength(0);
  });

  it('returns empty array for non-existent schedule id', () => {
    expect(service.getCompletions('no-such-id')).toHaveLength(0);
  });
});
