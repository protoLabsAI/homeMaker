import type { Meta, StoryObj } from '@storybook/react-vite';
import { SummaryCards } from './summary-cards';
import {
  mockBudgetSummaryPositive,
  mockBudgetSummaryNegative,
  mockBudgetSummaryBreakEven,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Budget/SummaryCards',
  component: SummaryCards,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SummaryCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PositiveBalance: Story = {
  args: {
    summary: mockBudgetSummaryPositive,
  },
};

export const NegativeBalance: Story = {
  args: {
    summary: mockBudgetSummaryNegative,
  },
};

export const BreakEven: Story = {
  args: {
    summary: mockBudgetSummaryBreakEven,
  },
};

export const Loading: Story = {
  args: {
    summary: null,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    summary: null,
    loading: false,
  },
};
