import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from '@storybook/test';
import { TransactionList } from './transaction-list';
import { mockTransactions, mockBudgetCategories } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Budget/TransactionList',
  component: TransactionList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    categories: mockBudgetCategories,
    isMutating: false,
    onDelete: fn(),
  },
} satisfies Meta<typeof TransactionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedTransactions: Story = {
  args: {
    transactions: mockTransactions,
  },
};

export const IncomeOnly: Story = {
  args: {
    transactions: mockTransactions.filter((t) => t.type === 'income'),
  },
};

export const ExpensesOnly: Story = {
  args: {
    transactions: mockTransactions.filter((t) => t.type === 'expense'),
  },
};

export const Loading: Story = {
  args: {
    transactions: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    transactions: [],
    loading: false,
  },
};
