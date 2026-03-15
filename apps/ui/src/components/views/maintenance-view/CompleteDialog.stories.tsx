import type { Meta, StoryObj } from '@storybook/react-vite';
import { CompleteDialog } from './complete-dialog';
import { mockScheduleOverdue, mockScheduleDueSoon } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Maintenance/CompleteDialog',
  component: CompleteDialog,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    isSubmitting: false,
  },
} satisfies Meta<typeof CompleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyForm: Story = {
  args: {
    schedule: mockScheduleOverdue,
  },
};

export const DueSoonSchedule: Story = {
  args: {
    schedule: mockScheduleDueSoon,
  },
};

export const Submitting: Story = {
  args: {
    schedule: mockScheduleOverdue,
    isSubmitting: true,
  },
};

export const Closed: Story = {
  args: {
    schedule: null,
    open: false,
  },
};
