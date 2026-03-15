import { Star } from 'lucide-react';
import { Card, CardContent } from '@protolabsai/ui/atoms';
import type { GamificationProfile } from '@protolabsai/types';

interface LevelCardProps {
  profile: GamificationProfile;
}

export function LevelCard({ profile }: LevelCardProps) {
  const { level, levelTitle, xp, xpToNextLevel } = profile;
  const xpProgress = xpToNextLevel > 0 ? Math.min((xp / xpToNextLevel) * 100, 100) : 100;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-0.5">
              <span className="text-4xl font-bold text-foreground">{level}</span>
              <span className="text-xl font-semibold text-foreground-secondary">{levelTitle}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP to next level
            </p>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
                role="progressbar"
                aria-valuenow={xpProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="XP progress"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {Math.round(xpProgress)}% progress
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
