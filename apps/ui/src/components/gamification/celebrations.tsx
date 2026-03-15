/**
 * CelebrationProvider — listens to gamification WebSocket events and triggers
 * proportional micro-interactions: toasts, confetti bursts, and overlays.
 *
 * Celebration calibration:
 *   XP gains          → toast (small)
 *   Streak milestones → toast + small confetti (orange)
 *   Achievement unlock → banner toast + medium confetti (gold/white)
 *   Level up          → full-screen overlay + large rainbow confetti
 *   Home health +5    → subtle green toast
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Flame, TrendingUp, Star } from 'lucide-react';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';
import type { AchievementDefinition } from '@protolabsai/types';

// ── Constants ────────────────────────────────────────────────────────────────

const STREAK_MILESTONES = new Set([5, 10, 25, 50, 100]);

// ── Event payload types ──────────────────────────────────────────────────────

interface XpGainedPayload {
  source: string;
  amount: number;
  newTotal: number;
}

interface LevelUpPayload {
  level: number;
  title: string;
  xp: number;
}

interface AchievementUnlockedPayload {
  achievement: AchievementDefinition;
  xpReward: number;
}

interface StreakUpdatedPayload {
  type: 'maintenance' | 'budget';
  current: number;
  best: number;
  isNewBest: boolean;
}

interface HealthScoreChangedPayload {
  old: number;
  new: number;
  pillarChanges: {
    maintenance: number;
    inventory: number;
    budget: number;
    systems: number;
  };
}

interface LevelUpState {
  oldLevel: number;
  newLevel: number;
  title: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function XpToast({
  amount,
  source,
  newTotal,
}: {
  amount: number;
  source: string;
  newTotal: number;
}) {
  // Approximate progress within current level using XP mod 100
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

function AchievementBanner({
  achievement,
  xpReward,
}: {
  achievement: AchievementDefinition;
  xpReward: number;
}) {
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

function LevelUpOverlay({ state, onDismiss }: { state: LevelUpState; onDismiss: () => void }) {
  const [displayLevel, setDisplayLevel] = useState(state.oldLevel);

  // Animate the counter from old level to new level after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setDisplayLevel(state.newLevel), 400);
    return () => clearTimeout(timer);
  }, [state.newLevel]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <div
      role="dialog"
      aria-label={`Level up! You reached level ${state.newLevel}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm cursor-pointer animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div className="text-center space-y-4 select-none">
        <p className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
          Level Up!
        </p>
        <div className="text-[clamp(6rem,20vw,10rem)] font-black text-primary tabular-nums leading-none transition-all duration-500">
          {displayLevel}
        </div>
        <p className="text-2xl font-bold text-foreground">{state.title}</p>
        <p className="text-sm text-muted-foreground">Tap to dismiss</p>
      </div>
    </div>,
    document.body
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CelebrationProvider() {
  const gamificationCelebrations = useAppStore(
    (state) => state.featureFlags.gamificationCelebrations
  );
  const [levelUpState, setLevelUpState] = useState<LevelUpState | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  const handleDismissLevelUp = () => setLevelUpState(null);

  useEffect(() => {
    if (!gamificationCelebrations) return;

    const api = getHttpApiClient();
    const unsubscribe = api.subscribeToEvents((type, payload) => {
      switch (type as string) {
        case 'gamification:xp-gained': {
          const data = payload as XpGainedPayload;
          toast.custom(
            () => <XpToast amount={data.amount} source={data.source} newTotal={data.newTotal} />,
            { duration: 3000, position: 'bottom-right' }
          );
          break;
        }

        case 'gamification:achievement-unlocked': {
          const data = payload as AchievementUnlockedPayload;
          void confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.2 },
            colors: ['#f59e0b', '#fcd34d', '#ffffff', '#fef3c7', '#fbbf24'],
          });
          toast.custom(
            () => <AchievementBanner achievement={data.achievement} xpReward={data.xpReward} />,
            { duration: 5000, position: 'top-center' }
          );
          break;
        }

        case 'gamification:level-up': {
          const data = payload as LevelUpPayload;
          const oldLevel = prevLevelRef.current ?? data.level - 1;
          prevLevelRef.current = data.level;
          setLevelUpState({ oldLevel, newLevel: data.level, title: data.title });

          // Continuous rainbow confetti for 3 seconds
          const end = Date.now() + 3000;
          const burst = () => {
            void confetti({
              particleCount: 6,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
            });
            void confetti({
              particleCount: 6,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
            });
            if (Date.now() < end) requestAnimationFrame(burst);
          };
          requestAnimationFrame(burst);
          break;
        }

        case 'gamification:streak-updated': {
          const data = payload as StreakUpdatedPayload;
          if (STREAK_MILESTONES.has(data.current)) {
            void confetti({
              particleCount: 50,
              spread: 45,
              origin: { y: 0.7 },
              colors: ['#f97316', '#fb923c', '#fed7aa', '#ea580c'],
            });
            toast.custom(
              () => (
                <div className="flex items-center gap-3 bg-card border border-orange-500/30 rounded-lg px-4 py-3 shadow-lg">
                  <Flame className="h-5 w-5 shrink-0 fill-orange-500 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-500">{data.current}-day streak!</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {data.type} streak milestone
                    </p>
                  </div>
                </div>
              ),
              { duration: 4000, position: 'bottom-right' }
            );
          }
          break;
        }

        case 'gamification:health-score-changed': {
          const data = payload as HealthScoreChangedPayload;
          const delta = data.new - data.old;
          if (delta >= 5) {
            toast.custom(
              () => (
                <div className="flex items-center gap-3 bg-card border border-green-500/30 rounded-lg px-4 py-3 shadow-lg">
                  <TrendingUp className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    Home Health +{delta}
                  </span>
                </div>
              ),
              { duration: 3000, position: 'bottom-right' }
            );
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, [gamificationCelebrations]);

  if (!levelUpState) return null;

  return <LevelUpOverlay state={levelUpState} onDismiss={handleDismissLevelUp} />;
}
