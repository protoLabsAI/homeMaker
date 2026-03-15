import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from '@storybook/test';
import { DueSummary } from './due-summary';
import {
  mockScheduleOverdue,
  mockScheduleDueSoon,
  mockScheduleUpToDate,
  mockScheduleWithAssetAndVendor,
} from '../../stories/mockData';
import type { MaintenanceSchedule } from './hooks/use-maintenance';

// Schedules where overdue=3, due-this-week=2, due-this-month=5, up-to-date=12
function buildSchedules(): MaintenanceSchedule[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const overdue = Array.from({ length: 3 }, (_, i) => ({
    ...mockScheduleOverdue,
    id: `overdue-${i}`,
    nextDueAt: new Date(now - (i + 5) * day).toISOString(),
  }));

  const dueThisWeek = Array.from({ length: 2 }, (_, i) => ({
    ...mockScheduleDueSoon,
    id: `week-${i}`,
    nextDueAt: new Date(now + (i + 1) * day).toISOString(),
  }));

  const dueThisMonth = Array.from({ length: 5 }, (_, i) => ({
    ...mockScheduleWithAssetAndVendor,
    id: `month-${i}`,
    nextDueAt: new Date(now + (i + 10) * day).toISOString(),
  }));

  const upToDate = Array.from({ length: 12 }, (_, i) => ({
    ...mockScheduleUpToDate,
    id: `uptodate-${i}`,
    nextDueAt: new Date(now + (i + 45) * day).toISOString(),
  }));

  return [...overdue, ...dueThisWeek, ...dueThisMonth, ...upToDate];
}

const meta = {
  title: 'homeMaker/Maintenance/DueSummary',
  component: DueSummary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onFilterChange: fn(),
  },
} satisfies Meta<typeof DueSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
  args: {
    schedules: buildSchedules(),
    activeFilter: 'all',
  },
};

export const FilteredOverdue: Story = {
  args: {
    schedules: buildSchedules(),
    activeFilter: 'overdue',
  },
};

export const AllUpToDate: Story = {
  args: {
    schedules: Array.from({ length: 8 }, (_, i) => ({
      ...mockScheduleUpToDate,
      id: `uptodate-${i}`,
      nextDueAt: new Date(Date.now() + (i + 60) * 24 * 60 * 60 * 1000).toISOString(),
    })),
    activeFilter: 'all',
  },
};

export const Empty: Story = {
  args: {
    schedules: [],
    activeFilter: 'all',
  },
};
