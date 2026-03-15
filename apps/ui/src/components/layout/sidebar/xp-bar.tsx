/**
 * Sidebar XP Bar
 *
 * Compact XP progress section shown in the sidebar below navigation items.
 * Displays current level title, progress bar, and XP counts.
 */

import { Star } from 'lucide-react';
import { useGamificationProfile } from '@/components/views/profile-view/hooks/use-gamification';

interface XpBarProps {
  /** Whether the sidebar is expanded or collapsed */
  expanded: boolean;
}

export function XpBar({ expanded }: XpBarProps) {
  const { data: profile, isLoading } = useGamificationProfile();

  if (isLoading || !profile) {
    if (!expanded) return null;
    return (
      <div className="px-3 py-2">
        <div className="h-8 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const { level, levelTitle, xp, xpToNextLevel } = profile;
  const pct = xpToNextLevel > 0 ? Math.min((xp / xpToNextLevel) * 100, 100) : 100;

  if (!expanded) {
    // Collapsed: show only level icon with tooltip
    return (
      <div className="flex justify-center px-2 py-1.5">
        <div
          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
          title={`Level ${level} — ${levelTitle}`}
        >
          <span className="text-[10px] font-bold text-primary">{level}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground truncate">{levelTitle}</span>
            <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">Lv.{level}</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-1 overflow-hidden mb-0.5">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="XP progress to next level"
        />
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
      </div>
    </div>
  );
}
