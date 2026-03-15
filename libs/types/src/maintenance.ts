/**
 * Maintenance scheduling types for recurring home maintenance tasks.
 *
 * Tracks schedules with configurable intervals, links to assets and vendors,
 * and records completion history for audit and forecasting.
 */

export type MaintenanceCategory =
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'exterior'
  | 'interior'
  | 'safety'
  | 'appliance'
  | 'landscaping'
  | 'pest-control'
  | 'other';

export interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string | null;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  assetId: string | null;
  category: MaintenanceCategory;
  estimatedCostUsd: number | null;
  vendorId: string | null;
  completedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceCompletion {
  id: string;
  scheduleId: string;
  completedAt: string;
  completedBy: string;
  notes: string | null;
  actualCostUsd: number | null;
}

/** Due-date summary counts for dashboard display */
export interface MaintenanceDueSummary {
  overdue: number;
  dueThisWeek: number;
  dueThisMonth: number;
  upToDate: number;
}

/** Filters for querying maintenance schedules */
export interface MaintenanceListFilters {
  category?: MaintenanceCategory;
  overdue?: boolean;
  assetId?: string;
  upcoming?: number;
}
