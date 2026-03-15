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
    hidden: true,
  },

  // ── Secret ───────────────────────────────────────────────────────────────
  {
    id: 'xp_milestone_10k',
    title: 'Dedicated',
    description: 'Accumulate 10,000 total XP',
    icon: 'zap',
    xpReward: 250,
    category: 'secret',
    hidden: true,
  },
  {
    id: 'xp_milestone_50k',
    title: 'XP Legend',
    description: 'Accumulate 50,000 total XP',
    icon: 'star',
    xpReward: 1000,
    category: 'secret',
    hidden: true,
  },

  // ── Onboarding — specific home milestones ─────────────────────────────
  {
    id: 'homeowner',
    title: 'Homeowner',
    description: 'Complete your first house project on the board',
    icon: 'home',
    xpReward: 50,
    category: 'onboarding',
  },
  {
    id: 'connected_home',
    title: 'Connected Home',
    description: 'Register your first sensor',
    icon: 'wifi',
    xpReward: 50,
    category: 'onboarding',
  },
  {
    id: 'scheduled',
    title: 'Scheduled',
    description: 'Create your first maintenance schedule',
    icon: 'calendar',
    xpReward: 50,
    category: 'onboarding',
  },
  {
    id: 'budgeted',
    title: 'Budgeted',
    description: 'Create your first budget category',
    icon: 'folder',
    xpReward: 50,
    category: 'onboarding',
  },
  {
    id: 'vault_keeper',
    title: 'Vault Keeper',
    description: 'Store your first secret in the vault',
    icon: 'lock',
    xpReward: 75,
    category: 'onboarding',
  },

  // ── Maintenance — milestone counts ────────────────────────────────────
  {
    id: 'on_schedule',
    title: 'On Schedule',
    description: 'Complete 3 maintenance tasks on time',
    icon: 'clock',
    xpReward: 75,
    category: 'maintenance',
  },
  {
    id: 'clockwork',
    title: 'Clockwork',
    description: 'Complete 10 maintenance tasks on time',
    icon: 'zap',
    xpReward: 150,
    category: 'maintenance',
  },
  {
    id: 'preventive_pro',
    title: 'Preventive Pro',
    description: 'Complete maintenance tasks in 4 different calendar quarters',
    icon: 'shield',
    xpReward: 200,
    category: 'maintenance',
  },
  {
    id: 'year_of_prevention',
    title: 'Year of Prevention',
    description: 'Complete maintenance tasks in 12 different calendar months',
    icon: 'star',
    xpReward: 500,
    category: 'maintenance',
  },
  {
    id: 'zero_overdue',
    title: 'Zero Overdue',
    description: 'Have no overdue maintenance tasks (with at least one schedule)',
    icon: 'check-circle',
    xpReward: 150,
    category: 'maintenance',
  },

  // ── Inventory — deeper milestones ─────────────────────────────────────
  {
    id: 'cataloger',
    title: 'Cataloger',
    description: 'Document 50 home assets',
    icon: 'book',
    xpReward: 400,
    category: 'inventory',
  },
  {
    id: 'museum_curator',
    title: 'Museum Curator',
    description: 'Add photos to 10 assets',
    icon: 'camera',
    xpReward: 200,
    category: 'inventory',
  },
  {
    id: 'warranty_warrior',
    title: 'Warranty Warrior',
    description: 'Track warranties on 10 assets',
    icon: 'shield-check',
    xpReward: 200,
    category: 'inventory',
  },

  // ── Budget — long streaks ─────────────────────────────────────────────
  {
    id: 'financial_fortress',
    title: 'Financial Fortress',
    description: 'Stay under budget for 12 consecutive months',
    icon: 'trending-down',
    xpReward: 1000,
    category: 'budget',
  },

  // ── Seasonal ──────────────────────────────────────────────────────────
  {
    id: 'winter_ready',
    title: 'Winter Ready',
    description: 'Complete a maintenance task during winter months (Dec–Feb)',
    icon: 'snowflake',
    xpReward: 150,
    category: 'seasonal',
  },
  {
    id: 'spring_fresh',
    title: 'Spring Fresh',
    description: 'Complete a maintenance task during spring months (Mar–May)',
    icon: 'flower',
    xpReward: 150,
    category: 'seasonal',
  },
  {
    id: 'summer_set',
    title: 'Summer Set',
    description: 'Complete a maintenance task during summer months (Jun–Aug)',
    icon: 'sun',
    xpReward: 150,
    category: 'seasonal',
  },
  {
    id: 'fall_prepared',
    title: 'Fall Prepared',
    description: 'Complete a maintenance task during fall months (Sep–Nov)',
    icon: 'leaf',
    xpReward: 150,
    category: 'seasonal',
  },

  // ── Secret — hidden until earned ──────────────────────────────────────
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a task between midnight and 5 AM',
    icon: 'moon',
    xpReward: 100,
    category: 'secret',
    hidden: true,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete 5 maintenance tasks in a single day',
    icon: 'zap',
    xpReward: 150,
    category: 'secret',
    hidden: true,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Interact with every major feature of the app',
    icon: 'compass',
    xpReward: 200,
    category: 'secret',
    hidden: true,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Reach a Home Health Score of 100',
    icon: 'award',
    xpReward: 500,
    category: 'secret',
    hidden: true,
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Reach a streak of 25 in any category',
    icon: 'flame',
    xpReward: 500,
    category: 'secret',
    hidden: true,
  },
];
