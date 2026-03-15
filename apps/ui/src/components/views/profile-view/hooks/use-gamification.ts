/**
 * Gamification React Query hooks
 *
 * Provides hooks for fetching gamification data (profile, achievements, health score,
 * quests, XP history) and subscribes to WebSocket events for real-time updates.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiGet } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type {
  GamificationProfile,
  AchievementWithStatus,
  HomeHealthScore,
  Quest,
  XpEvent,
} from '@protolabsai/types';

// ============================================================================
// Query keys
// ============================================================================

export const gamificationKeys = {
  profile: ['gamification', 'profile'] as const,
  achievements: ['gamification', 'achievements'] as const,
  healthScore: ['gamification', 'health-score'] as const,
  quests: ['gamification', 'quests'] as const,
  xpHistory: ['gamification', 'xp-history'] as const,
};

// ============================================================================
// Response types
// ============================================================================

interface ProfileResponse {
  success: boolean;
  data: GamificationProfile;
  error?: string;
}

interface AchievementsResponse {
  success: boolean;
  data: AchievementWithStatus[];
  error?: string;
}

interface HealthScoreResponse {
  success: boolean;
  data: HomeHealthScore;
  error?: string;
}

interface QuestsResponse {
  success: boolean;
  data: Quest[];
  error?: string;
}

interface XpHistoryResponse {
  success: boolean;
  data: XpEvent[];
  error?: string;
}

// ============================================================================
// WebSocket invalidation hook
// ============================================================================

/** Subscribe to gamification WebSocket events and invalidate affected queries. */
export function useGamificationEventSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const api = getHttpApiClient();
    const unsubscribe = api.subscribeToEvents((type) => {
      switch (type as string) {
        case 'gamification:xp-gained':
        case 'gamification:level-up':
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.profile });
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.xpHistory });
          break;
        case 'gamification:achievement-unlocked':
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.profile });
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.achievements });
          break;
        case 'gamification:streak-updated':
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.profile });
          break;
        case 'gamification:health-score-changed':
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.healthScore });
          void queryClient.invalidateQueries({ queryKey: gamificationKeys.profile });
          break;
      }
    });
    return unsubscribe;
  }, [queryClient]);
}

// ============================================================================
// Query hooks
// ============================================================================

export function useGamificationProfile() {
  return useQuery({
    queryKey: gamificationKeys.profile,
    queryFn: async () => {
      const result = await apiGet<ProfileResponse>('/api/gamification/profile');
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch profile');
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: gamificationKeys.achievements,
    queryFn: async () => {
      const result = await apiGet<AchievementsResponse>('/api/gamification/achievements');
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch achievements');
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useHomeHealthScore() {
  return useQuery({
    queryKey: gamificationKeys.healthScore,
    queryFn: async () => {
      const result = await apiGet<HealthScoreResponse>('/api/gamification/health-score');
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch health score');
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useQuests() {
  return useQuery({
    queryKey: gamificationKeys.quests,
    queryFn: async () => {
      const result = await apiGet<QuestsResponse>('/api/gamification/quests');
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch quests');
      return result.data;
    },
    staleTime: 30_000,
  });
}

export function useXpHistory() {
  return useQuery({
    queryKey: gamificationKeys.xpHistory,
    queryFn: async () => {
      const result = await apiGet<XpHistoryResponse>('/api/gamification/xp-history');
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch XP history');
      return result.data;
    },
    staleTime: 30_000,
  });
}
