import type { Meta, StoryObj } from '@storybook/react-vite';
import { HealthBreakdown } from './health-breakdown';
import {
  mockHealthScoreHigh,
  mockHealthScoreMedium,
  mockHealthScoreLow,
} from '../../stories/mockData';

const meta = {
  title: 'homeMaker/Profile/HealthBreakdown',
  component: HealthBreakdown,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HealthBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighScore: Story = {
  args: {
    score: mockHealthScoreHigh,
  },
};

export const MixedScore: Story = {
  args: {
    score: mockHealthScoreMedium,
  },
};

export const LowScore: Story = {
  args: {
    score: mockHealthScoreLow,
  },
};

export const NoHints: Story = {
  args: {
    score: {
      ...mockHealthScoreHigh,
      pillarHints: [],
    },
  },
};
