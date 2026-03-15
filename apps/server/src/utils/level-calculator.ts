/**
 * Level calculation for the gamification system.
 *
 * XP thresholds follow an exponential curve:
 * Level 1=0, 2=500, 3=1500, 4=3500, 5=7000, 6=12000, 7=20000, 8=32000, 9=50000, 10=75000
 */

export interface LevelInfo {
  level: number;
  title: string;
  xpToNextLevel: number;
}

/** XP required to reach each level (index = level - 1) */
const LEVEL_THRESHOLDS: ReadonlyArray<number> = [
  0, // Level 1
  500, // Level 2
  1500, // Level 3
  3500, // Level 4
  7000, // Level 5
  12000, // Level 6
  20000, // Level 7
  32000, // Level 8
  50000, // Level 9
  75000, // Level 10
];

const MAX_LEVEL = LEVEL_THRESHOLDS.length;

const LEVEL_TITLES: ReadonlyArray<string> = [
  'Homeowner', // Level 1
  'Handyman', // Level 2
  'Fixer', // Level 3
  'Maintainer', // Level 4
  'Home Pro', // Level 5
  'Property Expert', // Level 6
  'Estate Manager', // Level 7
  'Home Master', // Level 8
  'Grandmaster', // Level 9
  'Home Legend', // Level 10
];

/**
 * Calculate level and title from total XP.
 * Level is capped at 10; xpToNextLevel is 0 at max level.
 */
export function calculateLevel(totalXp: number): LevelInfo {
  let level = 1;

  for (let i = MAX_LEVEL - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && totalXp >= threshold) {
      level = i + 1;
      break;
    }
  }

  const title = LEVEL_TITLES[level - 1] ?? 'Homeowner';

  const nextThreshold = level < MAX_LEVEL ? (LEVEL_THRESHOLDS[level] ?? 0) : 0;
  const xpToNextLevel = level >= MAX_LEVEL ? 0 : Math.max(0, nextThreshold - totalXp);

  return { level, title, xpToNextLevel };
}

/**
 * Return the XP threshold required to reach a given level (1-10).
 * Returns 0 for level 1 and Infinity for levels beyond MAX_LEVEL.
 */
export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level > MAX_LEVEL) return Infinity;
  return LEVEL_THRESHOLDS[level - 1] ?? 0;
}
