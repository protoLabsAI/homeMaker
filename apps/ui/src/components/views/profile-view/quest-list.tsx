import { Target } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@protolabsai/ui/atoms';
import type { Quest } from '@protolabsai/types';

interface QuestItemProps {
  quest: Quest;
}

function QuestItem({ quest }: QuestItemProps) {
  const pct = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0;
  const isComplete = quest.progress >= quest.target;

  return (
    <div className="space-y-2 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{quest.title}</span>
            <Badge variant={isComplete ? 'success' : 'muted'} className="capitalize text-[10px]">
              {quest.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
        </div>
        <span className="text-xs font-semibold text-primary whitespace-nowrap">
          +{quest.xpReward} XP
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {quest.progress} / {quest.target}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-status-success' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${quest.title} progress`}
          />
        </div>
      </div>

      {quest.expiresAt && (
        <p className="text-[10px] text-muted-foreground">
          Expires {new Date(quest.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

interface QuestListProps {
  quests: Quest[];
}

export function QuestList({ quests }: QuestListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          Active Quests
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {quests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No active quests</p>
        ) : (
          quests.map((quest) => <QuestItem key={quest.id} quest={quest} />)
        )}
      </CardContent>
    </Card>
  );
}
