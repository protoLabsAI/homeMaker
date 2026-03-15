import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreakDisplay } from './streak-display';
import type { GamificationProfile } from '@protolabsai/types';

type StreakDisplayProps = {
  streaks: GamificationProfile['streaks'];
};

const meta = {
  title: 'homeMaker/Profile/StreakDisplay',
  component: StreakDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StreakDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveStreak: Story = {
  args: {
    streaks: {
      maintenance: { current: 12, best: 15, lastCompletedAt: '2026-03-14T00:00:00Z' },
      budget: { current: 3, best: 5, lastMonth: '2026-02-01' },
    },
  } satisfies StreakDisplayProps,
};

export const NewBestStreak: Story = {
  args: {
    streaks: {
      maintenance: { current: 20, best: 20, lastCompletedAt: '2026-03-15T00:00:00Z' },
      budget: { current: 6, best: 6, lastMonth: '2026-03-01' },
    },
  } satisfies StreakDisplayProps,
};

export const ZeroStreak: Story = {
  args: {
    streaks: {
      maintenance: { current: 0, best: 0, lastCompletedAt: null },
      budget: { current: 0, best: 0, lastMonth: null },
    },
  } satisfies StreakDisplayProps,
};

export const HighStreak: Story = {
  args: {
    streaks: {
      maintenance: { current: 52, best: 52, lastCompletedAt: '2026-03-15T00:00:00Z' },
      budget: { current: 12, best: 12, lastMonth: '2026-03-01' },
    },
  } satisfies StreakDisplayProps,
};
