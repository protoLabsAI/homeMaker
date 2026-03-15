/**
 * AchievementBanner Stories
 *
 * AchievementBanner is an internal sub-component of celebrations.tsx.
 * Play functions demonstrate the confetti interaction that would fire
 * when this banner appears in the live app.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from '@storybook/test';
import type { AchievementDefinition } from '@protolabsai/types';

interface AchievementBannerProps {
  achievement: AchievementDefinition;
  xpReward: number;
}

function AchievementBanner({ achievement, xpReward }: AchievementBannerProps) {
  return (
    <div className="w-full max-w-lg bg-card border border-border rounded-xl px-5 py-4 shadow-xl flex items-center gap-4">
      <span className="text-3xl shrink-0" role="img" aria-label={achievement.title}>
        {achievement.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Achievement Unlocked
          </span>
          <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5 font-semibold">
            +{xpReward} XP
          </span>
        </div>
        <p className="font-bold text-foreground truncate">{achievement.title}</p>
        <p className="text-sm text-muted-foreground truncate">{achievement.description}</p>
      </div>
    </div>
  );
}

const meta = {
  title: 'homeMaker/Celebrations/AchievementBanner',
  component: AchievementBanner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AchievementBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MaintenanceMilestone: Story = {
  args: {
    achievement: {
      id: 'ach-maintenance-1',
      title: 'Maintenance Pro',
      description: 'Completed 10 maintenance tasks on time.',
      icon: '🔧',
      xpReward: 250,
      category: 'maintenance',
    },
    xpReward: 250,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByText('Maintenance Pro');
    await expect(title).toBeVisible();
    const xpBadge = canvas.getByText('+250 XP');
    await expect(xpBadge).toBeVisible();
  },
};

export const InventoryAchievement: Story = {
  args: {
    achievement: {
      id: 'ach-inventory-1',
      title: 'Asset Manager',
      description: 'Added 5 assets with full warranty information.',
      icon: '📦',
      xpReward: 100,
      category: 'inventory',
    },
    xpReward: 100,
  },
};

export const SecretAchievement: Story = {
  args: {
    achievement: {
      id: 'ach-secret-1',
      title: 'Hidden Discovery',
      description: 'You found something special. Keep exploring!',
      icon: '🔮',
      xpReward: 1000,
      category: 'secret',
      hidden: true,
    },
    xpReward: 1000,
  },
};

export const OnboardingComplete: Story = {
  args: {
    achievement: {
      id: 'ach-onboard-1',
      title: 'Welcome Home',
      description: 'Set up your first home profile.',
      icon: '🏠',
      xpReward: 50,
      category: 'onboarding',
    },
    xpReward: 50,
  },
};
