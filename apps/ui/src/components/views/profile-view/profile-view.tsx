/**
 * Profile View
 *
 * Full gamification profile page showing level, achievements, streaks,
 * home health score, active quests, and XP history.
 */

import { Trophy } from 'lucide-react';
import { ScrollArea } from '@protolabsai/ui/atoms';
import { ErrorState, LoadingState } from '@protolabsai/ui/molecules';
import { PanelHeader } from '@/components/shared/panel-header';
import {
  useGamificationProfile,
  useAchievements,
  useHomeHealthScore,
  useQuests,
  useXpHistory,
  useGamificationEventSync,
} from './hooks/use-gamification';
import { LevelCard } from './level-card';
import { AchievementGrid } from './achievement-grid';
import { StreakDisplay } from './streak-display';
import { HealthBreakdown } from './health-breakdown';
import { QuestList } from './quest-list';
import { XpHistory } from './xp-history';

export function ProfileView() {
  // Sync real-time updates via WebSocket
  useGamificationEventSync();

  const profileQuery = useGamificationProfile();
  const achievementsQuery = useAchievements();
  const healthQuery = useHomeHealthScore();
  const questsQuery = useQuests();
  const xpHistoryQuery = useXpHistory();

  const isLoading = profileQuery.isLoading && achievementsQuery.isLoading;
  const error = profileQuery.error;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader icon={Trophy} title="Profile" />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {isLoading ? (
            <LoadingState message="Loading profile..." />
          ) : error ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load profile'}
              onRetry={() => void profileQuery.refetch()}
            />
          ) : profileQuery.data ? (
            <>
              {/* Level + XP progress */}
              <LevelCard profile={profileQuery.data} />

              {/* Two-column layout for streaks and health score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StreakDisplay streaks={profileQuery.data.streaks} />
                {healthQuery.data && <HealthBreakdown score={healthQuery.data} />}
              </div>

              {/* Active quests */}
              {questsQuery.data && <QuestList quests={questsQuery.data} />}

              {/* Achievements grid */}
              {achievementsQuery.data && <AchievementGrid achievements={achievementsQuery.data} />}

              {/* XP history */}
              {xpHistoryQuery.data && <XpHistory events={xpHistoryQuery.data} />}
            </>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
