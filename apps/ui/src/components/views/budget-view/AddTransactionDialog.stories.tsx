import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddTransactionDialog } from './add-transaction-dialog';
import { mockBudgetCategories } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Budget/AddTransactionDialog',
  component: AddTransactionDialog,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: () => {},
    categories: mockBudgetCategories,
    defaultMonth: '2026-03',
    isMutating: false,
    onSubmit: async () => {},
  },
} satisfies Meta<typeof AddTransactionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyForm: Story = {};

export const Submitting: Story = {
  args: {
    isMutating: true,
  },
};

export const NoCategories: Story = {
  args: {
    categories: [],
  },
};

export const Closed: Story = {
  args: {
    open: false,
  },
};
