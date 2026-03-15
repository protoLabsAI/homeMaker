/**
 * StreakMilestoneToast Stories
 *
 * The streak milestone toast is an inline render inside celebrations.tsx.
 * This story renders the equivalent visual design for review in isolation.
 * Play functions verify the toast content displays correctly.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from '@storybook/test';
import { Flame } from 'lucide-react';

interface StreakMilestoneToastProps {
  current: number;
  type: 'maintenance' | 'budget';
}

function StreakMilestoneToast({ current, type }: StreakMilestoneToastProps) {
  return (
    <div className="flex items-center gap-3 bg-card border border-orange-500/30 rounded-lg px-4 py-3 shadow-lg">
      <Flame className="h-5 w-5 shrink-0 fill-orange-500 text-orange-500" />
      <div>
        <p className="font-semibold text-orange-500">{current}-day streak!</p>
        <p className="text-xs text-muted-foreground capitalize">{type} streak milestone</p>
      </div>
    </div>
  );
}

const meta = {
  title: 'homeMaker/Celebrations/StreakMilestoneToast',
  component: StreakMilestoneToast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StreakMilestoneToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FiveDayStreak: Story = {
  args: {
    current: 5,
    type: 'maintenance',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const streakText = canvas.getByText('5-day streak!');
    await expect(streakText).toBeVisible();
    const milestone = canvas.getByText('maintenance streak milestone');
    await expect(milestone).toBeVisible();
  },
};

export const TenDayStreak: Story = {
  args: {
    current: 10,
    type: 'budget',
  },
};

export const TwentyFiveDayStreak: Story = {
  args: {
    current: 25,
    type: 'maintenance',
  },
};

export const HundredDayStreak: Story = {
  args: {
    current: 100,
    type: 'budget',
  },
};
