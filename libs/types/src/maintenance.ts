/**
 * Maintenance schedule types for homeMaker.
 *
 * Maintenance schedules track recurring household maintenance tasks linked to
 * assets and vendors. Schedules have an interval (in days) and track when the
 * next task is due so the scheduler can auto-generate calendar events and todos.
 */

/** A recurring maintenance schedule linked to an asset and optional vendor */
export interface MaintenanceSchedule {
  /** Unique identifier */
  id: string;
  /** Title of the maintenance task (e.g. "HVAC Filter Replacement") */
  title: string;
  /** Optional description of what the maintenance involves */
  description: string | null;
  /** Linked asset ID (no FK enforcement — asset may be deleted independently) */
  assetId: string | null;
  /** Denormalized asset name for display without a join */
  assetName: string | null;
  /** Vendor or contractor name (e.g. "Acme HVAC Services") */
  vendorName: string | null;
  /** Vendor phone number */
  vendorPhone: string | null;
  /** How often the task recurs, in days (e.g. 90 for quarterly) */
  intervalDays: number;
  /** ISO-8601 date of the last time this task was completed, or null if never */
  lastCompletedAt: string | null;
  /** ISO-8601 date when this task is next due */
  nextDueAt: string;
  /** Estimated cost in cents */
  estimatedCostCents: number | null;
  /** Free-form notes */
  notes: string | null;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last-update timestamp */
  updatedAt: string;
}

/** Fields accepted when creating a new schedule (id and timestamps are generated) */
export type CreateMaintenanceScheduleInput = Omit<
  MaintenanceSchedule,
  'id' | 'createdAt' | 'updatedAt'
>;

/** Fields accepted when updating an existing schedule (all optional) */
export type UpdateMaintenanceScheduleInput = Partial<
  Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>
>;
