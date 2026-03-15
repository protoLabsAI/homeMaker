import type { ElementType } from 'react';
import { Wrench, Package, DollarSign, Cpu, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@protolabsai/ui/atoms';
import type { HomeHealthScore } from '@protolabsai/types';

// ============================================================================
// Pillar definitions
// ============================================================================

const PILLARS = [
  {
    key: 'maintenance' as const,
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-status-warning',
    bg: 'bg-status-warning-bg',
    bar: 'bg-status-warning',
  },
  {
    key: 'inventory' as const,
    label: 'Inventory',
    icon: Package,
    color: 'text-status-info',
    bg: 'bg-status-info-bg',
    bar: 'bg-status-info',
  },
  {
    key: 'budget' as const,
    label: 'Budget',
    icon: DollarSign,
    color: 'text-status-success',
    bg: 'bg-status-success-bg',
    bar: 'bg-status-success',
  },
  {
    key: 'systems' as const,
    label: 'Systems',
    icon: Cpu,
    color: 'text-primary',
    bg: 'bg-primary/10',
    bar: 'bg-primary',
  },
];

// ============================================================================
// Pillar row
// ============================================================================

interface PillarRowProps {
  label: string;
  score: number;
  maxScore?: number;
  icon: ElementType;
  color: string;
  bg: string;
  bar: string;
}

function PillarRow({ label, score, maxScore = 25, icon: Icon, color, bg, bar }: PillarRowProps) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-sm font-bold ${color}`}>
          {score}
          <span className="text-muted-foreground font-normal">/{maxScore}</span>
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full ${bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} score`}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Health breakdown
// ============================================================================

interface HealthBreakdownProps {
  score: HomeHealthScore;
}

export function HealthBreakdown({ score }: HealthBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Home Health Score</span>
          <span className="text-3xl font-bold text-foreground">{score.total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {PILLARS.map((pillar) => (
          <PillarRow
            key={pillar.key}
            label={pillar.label}
            score={score[pillar.key]}
            icon={pillar.icon}
            color={pillar.color}
            bg={pillar.bg}
            bar={pillar.bar}
          />
        ))}

        {score.pillarHints.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Lightbulb className="w-3.5 h-3.5" />
              Improvement Tips
            </div>
            <ul className="space-y-1">
              {score.pillarHints.map((hint: string, i: number) => (
                <li key={i} className="text-sm text-foreground-secondary flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
