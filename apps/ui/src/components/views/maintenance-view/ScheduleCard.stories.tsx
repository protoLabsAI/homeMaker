import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScheduleCard } from './schedule-card';
import {
  mockScheduleOverdue,
  mockScheduleDueSoon,
  mockScheduleUpToDate,
  mockScheduleWithAssetAndVendor,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Maintenance/ScheduleCard',
  component: ScheduleCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onMarkComplete: () => {},
    onViewDetails: () => {},
  },
} satisfies Meta<typeof ScheduleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overdue: Story = {
  args: {
    schedule: mockScheduleOverdue,
  },
};

export const DueSoon: Story = {
  args: {
    schedule: mockScheduleDueSoon,
  },
};

export const UpToDate: Story = {
  args: {
    schedule: mockScheduleUpToDate,
  },
};

export const WithAssetAndVendor: Story = {
  args: {
    schedule: mockScheduleWithAssetAndVendor,
  },
};

export const NoNextDue: Story = {
  args: {
    schedule: {
      ...mockScheduleUpToDate,
      id: 'sched-no-due',
      nextDueAt: null,
      lastCompletedAt: null,
      title: 'Pest Control Inspection',
    },
  },
};
