/**
 * Home Health Score Widget
 *
 * Displays the Home Health Score as a circular progress ring with pillar indicators.
 * Clicking the widget navigates to the Profile page.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Wrench, Package, DollarSign, Cpu } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@protolabsai/ui/atoms';
import {
  useHomeHealthScore,
  useGamificationEventSync,
} from '@/components/views/profile-view/hooks/use-gamification';

// ============================================================================
// Helpers
// ============================================================================

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 50) return '#eab308'; // yellow
  return '#ef4444'; // red
}

function scoreTailwind(score: number): string {
  if (score >= 80) return 'text-status-success';
  if (score >= 50) return 'text-status-warning';
  return 'text-status-error';
}

// ============================================================================
// Circular progress ring (SVG)
// ============================================================================

interface RingProps {
  score: number;
  size?: number;
}

function ScoreRing({ score, size = 120 }: RingProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / 100, 0), 1);
  const offset = circumference * (1 - pct);
  const color = scoreColor(score);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreTailwind(score)}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Pillar indicators
// ============================================================================

const PILLARS = [
  { key: 'maintenance' as const, label: 'Maint.', icon: Wrench, color: 'text-status-warning' },
  { key: 'inventory' as const, label: 'Invent.', icon: Package, color: 'text-status-info' },
  { key: 'budget' as const, label: 'Budget', icon: DollarSign, color: 'text-status-success' },
  { key: 'systems' as const, label: 'Systems', icon: Cpu, color: 'text-primary' },
];

interface PillarBadgeProps {
  label: string;
  score: number;
  icon: React.ElementType;
  color: string;
}

function PillarBadge({ label, score, icon: Icon, color }: PillarBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-sm font-bold ${color}`}>{score}</span>
      <span className="text-[9px] text-muted-foreground leading-none">{label}</span>
    </div>
  );
}

// ============================================================================
// Main widget
// ============================================================================

export function HealthScoreWidget() {
  const navigate = useNavigate();

  // Keep real-time updates flowing
  useGamificationEventSync();

  const { data: score, isLoading, error } = useHomeHealthScore();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="w-[120px] h-[120px] rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !score) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Health score unavailable</p>
        </CardContent>
      </Card>
    );
  }

  // Trend: compare total to last recorded value (approximated via pillar sum drift)
  // Since we don't have historical data in the client, we indicate based on score level
  const TrendIcon = score.total >= 70 ? TrendingUp : score.total >= 40 ? Minus : TrendingDown;
  const trendColor =
    score.total >= 70
      ? 'text-status-success'
      : score.total >= 40
        ? 'text-muted-foreground'
        : 'text-status-error';

  return (
    <Card
      className="cursor-pointer hover:border-ring/50 hover:shadow-sm transition-all duration-150"
      onClick={() => void navigate({ to: '/profile' as unknown as '/' })}
      role="button"
      aria-label="View full profile"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void navigate({ to: '/profile' as unknown as '/' });
        }
      }}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <ScoreRing score={score.total} />

          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">Home Health Score</h3>
                <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
              </div>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(score.calculatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex justify-between">
              {PILLARS.map((pillar) => (
                <PillarBadge
                  key={pillar.key}
                  label={pillar.label}
                  score={score[pillar.key]}
                  icon={pillar.icon}
                  color={pillar.color}
                />
              ))}
            </div>

            {score.pillarHints.length > 0 && (
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                {score.pillarHints[0]}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
