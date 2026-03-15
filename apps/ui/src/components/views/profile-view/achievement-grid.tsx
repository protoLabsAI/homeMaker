import { useState } from 'react';
import { HelpCircle, Lock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
} from '@protolabsai/ui/atoms';
import type { AchievementWithStatus } from '@protolabsai/types';

// ============================================================================
// Category colors
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: 'bg-status-warning-bg text-status-warning',
  inventory: 'bg-status-info-bg text-status-info',
  budget: 'bg-status-success-bg text-status-success',
  onboarding: 'bg-primary/10 text-primary',
  seasonal: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
  secret: 'bg-muted text-muted-foreground',
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground';
}

// ============================================================================
// Single achievement tile
// ============================================================================

interface TileProps {
  achievement: AchievementWithStatus;
  onClick: () => void;
}

function AchievementTile({ achievement, onClick }: TileProps) {
  const isSecret = achievement.hidden && !achievement.earned;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center
        transition-all duration-150 cursor-pointer
        ${achievement.earned ? 'border-border hover:border-ring/50 hover:shadow-sm' : 'border-border/40 opacity-60 hover:opacity-80'}
      `}
      aria-label={isSecret ? 'Secret achievement' : achievement.title}
    >
      {achievement.earned && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-status-success" />
      )}

      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${achievement.earned ? categoryColor(achievement.category) : 'bg-muted'}
        `}
      >
        {isSecret ? (
          <HelpCircle className="w-6 h-6 text-muted-foreground" />
        ) : !achievement.earned ? (
          <Lock className="w-5 h-5 text-muted-foreground" />
        ) : (
          <span role="img" aria-label={achievement.title}>
            {achievement.icon}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <p
          className={`text-xs font-medium leading-tight ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {isSecret ? '???' : achievement.title}
        </p>
        {achievement.earned && achievement.unlockedAt && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Achievement detail dialog
// ============================================================================

interface DetailDialogProps {
  achievement: AchievementWithStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AchievementDetailDialog({ achievement, open, onOpenChange }: DetailDialogProps) {
  if (!achievement) return null;

  const isSecret = achievement.hidden && !achievement.earned;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                ${achievement.earned ? categoryColor(achievement.category) : 'bg-muted'}
              `}
            >
              {isSecret ? (
                <HelpCircle className="w-6 h-6 text-muted-foreground" />
              ) : (
                <span role="img" aria-label={achievement.title}>
                  {achievement.icon}
                </span>
              )}
            </div>
            <div>
              <DialogTitle>{isSecret ? 'Secret Achievement' : achievement.title}</DialogTitle>
              <Badge variant="muted" className="mt-1 capitalize">
                {achievement.category}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        <DialogDescription className="text-sm text-foreground-secondary">
          {isSecret
            ? 'Complete certain actions to discover this hidden achievement.'
            : achievement.description}
        </DialogDescription>
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-muted-foreground">XP Reward</span>
          <span className="font-semibold text-foreground">+{achievement.xpReward} XP</span>
        </div>
        {achievement.earned && achievement.unlockedAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unlocked</span>
            <span className="text-foreground">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          </div>
        )}
        {!achievement.earned && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-muted-foreground">Locked</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Achievement grid
// ============================================================================

interface AchievementGridProps {
  achievements: AchievementWithStatus[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const [selected, setSelected] = useState<AchievementWithStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const earnedCount = achievements.filter((a) => a.earned).length;

  function handleTileClick(achievement: AchievementWithStatus) {
    setSelected(achievement);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Achievements</span>
          <span className="text-sm font-normal text-muted-foreground">
            {earnedCount} / {achievements.length} earned
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {achievements.map((achievement) => (
            <AchievementTile
              key={achievement.id}
              achievement={achievement}
              onClick={() => handleTileClick(achievement)}
            />
          ))}
        </div>
        {achievements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No achievements yet</p>
        )}
      </CardContent>

      <AchievementDetailDialog
        achievement={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
