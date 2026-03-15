import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScheduleDetailPanel } from './schedule-detail-panel';
import {
  mockScheduleOverdue,
  mockScheduleUpToDate,
  mockScheduleWithAssetAndVendor,
  mockCompletions,
} from '../../stories/mockData';
import { withQueryClient } from '../../stories/mockProviders';

const meta = {
  title: 'homeMaker/Maintenance/ScheduleDetailPanel',
  component: ScheduleDetailPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    onClose: () => {},
  },
} satisfies Meta<typeof ScheduleDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCompletionHistory: Story = {
  decorators: [
    withQueryClient([
      {
        queryKey: ['maintenance', 'completions', 'sched-001'],
        data: mockCompletions,
      },
    ]),
  ],
  args: {
    schedule: mockScheduleOverdue,
  },
};

export const WithAssetAndVendor: Story = {
  decorators: [
    withQueryClient([
      {
        queryKey: ['maintenance', 'completions', 'sched-004'],
        data: mockCompletions.slice(0, 2),
      },
    ]),
  ],
  args: {
    schedule: mockScheduleWithAssetAndVendor,
  },
};

export const NoHistory: Story = {
  decorators: [
    withQueryClient([
      {
        queryKey: ['maintenance', 'completions', 'sched-003'],
        data: [],
      },
    ]),
  ],
  args: {
    schedule: mockScheduleUpToDate,
  },
};

export const Closed: Story = {
  decorators: [withQueryClient()],
  args: {
    schedule: null,
  },
};
