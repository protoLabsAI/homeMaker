/**
 * Gamification domain mixin for the HTTP API client.
 *
 * Provides: gamification (profile, achievements, healthScore, quests, xpHistory, markAchievementSeen)
 */
import { BaseHttpClient, type Constructor } from './base-http-client';
import type {
  GamificationProfile,
  AchievementWithStatus,
  HomeHealthScore,
  Quest,
  XpEvent,
} from '@protolabsai/types';

export interface GamificationProfileResponse {
  success: boolean;
  data: GamificationProfile;
  error?: string;
}

export interface AchievementsResponse {
  success: boolean;
  data: AchievementWithStatus[];
  error?: string;
}

export interface HealthScoreResponse {
  success: boolean;
  data: HomeHealthScore;
  error?: string;
}

export interface QuestsResponse {
  success: boolean;
  data: Quest[];
  error?: string;
}

export interface XpHistoryResponse {
  success: boolean;
  data: XpEvent[];
  error?: string;
}

export interface MarkSeenResponse {
  success: boolean;
  data: { id: string };
  error?: string;
}

export const withGamificationClient = <TBase extends Constructor<BaseHttpClient>>(Base: TBase) =>
  class extends Base {
    gamification = {
      getProfile: (): Promise<GamificationProfileResponse> => this.get('/api/gamification/profile'),

      getAchievements: (): Promise<AchievementsResponse> =>
        this.get('/api/gamification/achievements'),

      getHealthScore: (): Promise<HealthScoreResponse> =>
        this.get('/api/gamification/health-score'),

      getQuests: (): Promise<QuestsResponse> => this.get('/api/gamification/quests'),

      getXpHistory: (): Promise<XpHistoryResponse> => this.get('/api/gamification/xp-history'),

      markAchievementSeen: (id: string): Promise<MarkSeenResponse> =>
        this.post(`/api/gamification/mark-achievement-seen/${id}`, {}),
    };
  };
