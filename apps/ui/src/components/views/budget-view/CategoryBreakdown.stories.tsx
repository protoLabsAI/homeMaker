import type { Meta, StoryObj } from '@storybook/react-vite';
import { CategoryBreakdown } from './category-breakdown';
import { mockCategoryBreakdown } from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Budget/CategoryBreakdown',
  component: CategoryBreakdown,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CategoryBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullBreakdown: Story = {
  args: {
    byCategory: mockCategoryBreakdown,
  },
};

export const SingleCategory: Story = {
  args: {
    byCategory: [{ categoryId: 'cat-001', categoryName: 'Utilities', total: 23400 }],
  },
};

export const Loading: Story = {
  args: {
    byCategory: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    byCategory: [],
    loading: false,
  },
};
