import type { Meta, StoryObj } from '@storybook/react-vite';
import { AchievementGrid } from './achievement-grid';
import { mockAchievements } from '../../stories/mockData';
import type { AchievementWithStatus } from '@protolabsai/types';

const allEarned: AchievementWithStatus[] = mockAchievements.map((a) => ({
  ...a,
  earned: true,
  unlockedAt: '2025-06-01T00:00:00Z',
  seen: true,
  hidden: false,
}));

const allLocked: AchievementWithStatus[] = mockAchievements.map((a) => ({
  ...a,
  earned: false,
  unlockedAt: null,
  seen: false,
  hidden: false,
}));

const meta = {
  title: 'homeMaker/Profile/AchievementGrid',
  component: AchievementGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AchievementGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedStates: Story = {
  args: {
    achievements: mockAchievements,
  },
};

export const AllEarned: Story = {
  args: {
    achievements: allEarned,
  },
};

export const AllLocked: Story = {
  args: {
    achievements: allLocked,
  },
};

export const Empty: Story = {
  args: {
    achievements: [],
  },
};
