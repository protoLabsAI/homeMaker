/**
 * XpToast Stories
 *
 * XpToast is an internal sub-component of celebrations.tsx.
 * This story renders the equivalent visual design so it can be
 * reviewed and iterated in isolation.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Star } from 'lucide-react';

interface XpToastProps {
  amount: number;
  source: string;
  newTotal: number;
}

function XpToast({ amount, source, newTotal }: XpToastProps) {
  const progressPct = Math.min((newTotal % 100) * 1, 100);
  return (
    <div className="flex flex-col gap-1.5 bg-card border border-amber-500/30 rounded-lg px-4 py-3 shadow-lg min-w-[240px]">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
        <span className="font-semibold text-amber-500">+{amount} XP</span>
        <span className="text-sm text-muted-foreground truncate">{source}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-[width] duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'homeMaker/Celebrations/XpToast',
  component: XpToast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof XpToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    amount: 50,
    source: 'Maintenance completed',
    newTotal: 472,
  },
};

export const SmallGain: Story = {
  args: {
    amount: 10,
    source: 'Budget entry added',
    newTotal: 155,
  },
};

export const LargeGain: Story = {
  args: {
    amount: 200,
    source: 'Achievement unlocked',
    newTotal: 895,
  },
};

export const NearLevelUp: Story = {
  args: {
    amount: 25,
    source: 'Task completed',
    newTotal: 97,
  },
};
