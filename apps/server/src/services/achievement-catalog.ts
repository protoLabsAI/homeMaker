/**
 * Static achievement catalog — all available achievements in the game.
 *
 * This is the single source of truth for achievement definitions.
 * The achievement-evaluator maps each id to its unlock condition.
 */

import type { AchievementDefinition } from '@protolabsai/types';

export const ACHIEVEMENT_CATALOG: ReadonlyArray<AchievementDefinition> = [
  // ── Onboarding ───────────────────────────────────────────────────────────
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Earn your first XP',
    icon: 'star',
    xpReward: 50,
    category: 'onboarding',
  },
  {
    id: 'getting_started',
    title: 'Getting Started',
    description: 'Reach Level 2',
    icon: 'arrow-up',
    xpReward: 100,
    category: 'onboarding',
  },

  // ── Maintenance ──────────────────────────────────────────────────────────
  {
    id: 'maintenance_streak_3',
    title: 'On a Roll',
    description: 'Complete maintenance 3 times in a row on time',
    icon: 'zap',
    xpReward: 75,
    category: 'maintenance',
  },
  {
    id: 'maintenance_streak_7',
    title: 'Consistent',
    description: 'Maintain a 7-task streak',
    icon: 'flame',
    xpReward: 150,
    category: 'maintenance',
  },
  {
    id: 'maintenance_streak_30',
    title: 'Iron Discipline',
    description: 'Maintain a 30-task streak',
    icon: 'shield',
    xpReward: 500,
    category: 'maintenance',
  },
  {
    id: 'maintenance_best_10',
    title: 'Streak Champion',
    description: 'Achieve a best streak of 10',
    icon: 'trophy',
    xpReward: 200,
    category: 'maintenance',
  },
  {
    id: 'on_time_5',
    title: 'Punctual',
    description: 'Complete 5 maintenance tasks on time',
    icon: 'clock',
    xpReward: 100,
    category: 'maintenance',
  },
  {
    id: 'on_time_25',
    title: 'Maintenance Pro',
    description: 'Complete 25 maintenance tasks on time',
    icon: 'wrench',
    xpReward: 300,
    category: 'maintenance',
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  {
    id: 'first_asset',
    title: 'Home Inventory',
    description: 'Add your first asset to the inventory',
    icon: 'package',
    xpReward: 50,
    category: 'inventory',
  },
  {
    id: 'asset_collector_10',
    title: 'Cataloger',
    description: 'Document 10 home assets',
    icon: 'layers',
    xpReward: 150,
    category: 'inventory',
  },
  {
    id: 'asset_collector_25',
    title: 'Home Archivist',
    description: 'Document 25 home assets',
    icon: 'archive',
    xpReward: 300,
    category: 'inventory',
  },
  {
    id: 'warranty_tracker',
    title: 'Warranty Watcher',
    description: 'Track warranties on 5 assets',
    icon: 'file-text',
    xpReward: 100,
    category: 'inventory',
  },

  // ── Budget ───────────────────────────────────────────────────────────────
  {
    id: 'first_transaction',
    title: 'Money Mindful',
    description: 'Log your first budget transaction',
    icon: 'dollar-sign',
    xpReward: 50,
    category: 'budget',
  },
  {
    id: 'budget_conscious',
    title: 'Budget Conscious',
    description: 'Stay under budget for a month',
    icon: 'trending-down',
    xpReward: 100,
    category: 'budget',
  },
  {
    id: 'budget_streak_3',
    title: 'Frugal',
    description: 'Stay under budget for 3 months in a row',
    icon: 'piggy-bank',
    xpReward: 250,
    category: 'budget',
  },
  {
    id: 'budget_streak_6',
    title: 'Budget Master',
    description: 'Stay under budget for 6 months in a row',
    icon: 'award',
    xpReward: 500,
    category: 'budget',
  },

  // ── Levels ───────────────────────────────────────────────────────────────
  {
    id: 'level_5',
    title: 'Home Pro',
    description: 'Reach Level 5',
    icon: 'star',
    xpReward: 200,
    category: 'onboarding',
  },
  {
    id: 'level_10',
    title: 'Home Legend',
    description: 'Reach the maximum level (10)',
    icon: 'crown',
    xpReward: 1000,
    category: 'secret',
  },

  // ── Secret ───────────────────────────────────────────────────────────────
  {
    id: 'xp_milestone_10k',
    title: 'Dedicated',
    description: 'Accumulate 10,000 total XP',
    icon: 'zap',
    xpReward: 250,
    category: 'secret',
  },
  {
    id: 'xp_milestone_50k',
    title: 'XP Legend',
    description: 'Accumulate 50,000 total XP',
    icon: 'star',
    xpReward: 1000,
    category: 'secret',
  },
];
