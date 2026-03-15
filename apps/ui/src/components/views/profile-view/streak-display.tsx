import { Flame, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@protolabsai/ui/atoms';
import type { GamificationProfile } from '@protolabsai/types';

interface StreakRowProps {
  label: string;
  current: number;
  best: number;
}

function StreakRow({ label, current, best }: StreakRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${current > 0 ? 'bg-status-warning-bg' : 'bg-muted'}
          `}
        >
          <Flame
            className={`w-5 h-5 ${current > 0 ? 'text-status-warning' : 'text-muted-foreground'}`}
          />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>

      <div className="flex items-center gap-6 text-right">
        <div>
          <div
            className={`text-2xl font-bold ${current > 0 ? 'text-status-warning' : 'text-muted-foreground'}`}
          >
            {current}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Current</div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <Award className="w-3 h-3 text-muted-foreground" />
            <div className="text-sm font-semibold text-foreground-secondary">{best}</div>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Best</div>
        </div>
      </div>
    </div>
  );
}

interface StreakDisplayProps {
  streaks: GamificationProfile['streaks'];
}

export function StreakDisplay({ streaks }: StreakDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Streaks</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <StreakRow
          label="Maintenance"
          current={streaks.maintenance.current}
          best={streaks.maintenance.best}
        />
        <StreakRow label="Budget" current={streaks.budget.current} best={streaks.budget.best} />
      </CardContent>
    </Card>
  );
}
