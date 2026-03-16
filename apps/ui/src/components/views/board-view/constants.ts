import type { Feature } from '@/store/types';

export type ColumnId = Feature['status'];

/**
 * Empty state configuration for each column type
 */
export interface EmptyStateConfig {
  title: string;
  description: string;
  icon: 'lightbulb' | 'play' | 'clock' | 'check' | 'sparkles';
  shortcutKey?: string; // Keyboard shortcut label (e.g., 'N', 'A')
  shortcutHint?: string; // Human-readable shortcut hint
  primaryAction?: {
    label: string;
    actionType: 'ai-suggest' | 'none';
  };
}

/**
 * Default empty state configurations per column type
 */
export const EMPTY_STATE_CONFIGS: Record<string, EmptyStateConfig> = {
  backlog: {
    title: 'Ready for Ideas',
    description:
      'Add your first home project task using the button below, or let AI help generate ideas.',
    icon: 'lightbulb',
    shortcutHint: 'Press',
    primaryAction: {
      label: 'Use AI Suggestions',
      actionType: 'none',
    },
  },
  in_progress: {
    title: 'Nothing in Progress',
    description: 'Drag a task from To Do here or click implement to start working on it.',
    icon: 'play',
  },
  review: {
    title: 'Nothing to Check',
    description: 'Tasks being reviewed or checked will appear here.',
    icon: 'clock',
  },
  blocked: {
    title: 'Nothing On Hold',
    description: 'Tasks that are temporarily paused or waiting will appear here.',
    icon: 'clock',
  },
  done: {
    title: 'No Completed Tasks',
    description: 'Finished home tasks will appear here.',
    icon: 'check',
  },
  // Legacy column (deprecated, but kept for backwards compatibility)
  waiting_approval: {
    title: 'No Items Awaiting Approval',
    description: 'Tasks will appear here after work is complete and need your review.',
    icon: 'clock',
  },
};

/**
 * Get empty state config for a column
 */
export function getEmptyStateConfig(columnId: string): EmptyStateConfig {
  return EMPTY_STATE_CONFIGS[columnId] || EMPTY_STATE_CONFIGS.default;
}

export interface Column {
  id: ColumnId;
  title: string;
  colorClass: string;
}

// Canonical 5-status columns
export const COLUMNS: Column[] = [
  { id: 'backlog', title: 'To Do', colorClass: 'bg-[var(--status-backlog)]' },
  {
    id: 'in_progress',
    title: 'In Progress',
    colorClass: 'bg-[var(--status-in-progress)]',
  },
  {
    id: 'review',
    title: 'In Review',
    colorClass: 'bg-[var(--status-review)]',
  },
  {
    id: 'blocked',
    title: 'On Hold',
    colorClass: 'bg-[var(--status-blocked)]',
  },
  {
    id: 'done',
    title: 'Done',
    colorClass: 'bg-[var(--status-done)]',
  },
];
