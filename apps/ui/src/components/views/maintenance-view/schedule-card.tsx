import { Wrench, Clock, Building2, Package } from 'lucide-react';
import { Button, Badge } from '@protolabsai/ui/atoms';
import type { MaintenanceSchedule } from './hooks/use-maintenance';
import { getDueInfo } from './hooks/use-maintenance';

interface ScheduleCardProps {
  schedule: MaintenanceSchedule;
  onMarkComplete: (schedule: MaintenanceSchedule) => void;
  onViewDetails: (schedule: MaintenanceSchedule) => void;
}

function formatIntervalText(days: number): string {
  if (days === 1) return 'Every day';
  if (days === 7) return 'Every week';
  if (days === 14) return 'Every 2 weeks';
  if (days === 30) return 'Every month';
  if (days === 60) return 'Every 2 months';
  if (days === 90) return 'Every 3 months';
  if (days === 180) return 'Every 6 months';
  if (days === 365) return 'Every year';
  return `Every ${days} days`;
}

function DueStatusBadge({ schedule }: { schedule: MaintenanceSchedule }) {
  const info = getDueInfo(schedule);

  if (!info.nextDueAt) {
    return <Badge variant="muted">Not scheduled</Badge>;
  }

  if (info.status === 'overdue') {
    return (
      <Badge variant="error">
        Overdue by {info.daysOverdue} {info.daysOverdue === 1 ? 'day' : 'days'}
      </Badge>
    );
  }

  if (info.status === 'due-soon') {
    if (info.daysUntilDue === 0) {
      return <Badge variant="warning">Due today</Badge>;
    }
    return (
      <Badge variant="warning">
        Due in {info.daysUntilDue} {info.daysUntilDue === 1 ? 'day' : 'days'}
      </Badge>
    );
  }

  const formatted = info.nextDueAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <Badge variant="success">Next: {formatted}</Badge>;
}

function CategoryBadge({ category }: { category: MaintenanceSchedule['category'] }) {
  const label = category
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return <Badge variant="muted">{label}</Badge>;
}

export function ScheduleCard({ schedule, onMarkComplete, onViewDetails }: ScheduleCardProps) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-ring/50 transition-colors cursor-pointer"
      onClick={() => onViewDetails(schedule)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground truncate">{schedule.title}</span>
        </div>
        <CategoryBadge category={schedule.category} />
      </div>

      {/* Interval */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>{formatIntervalText(schedule.intervalDays)}</span>
      </div>

      {/* Asset / Vendor links */}
      {(schedule.assetName || schedule.vendorName) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {schedule.assetName && (
            <span
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Asset navigation handled by parent via detail panel
              }}
            >
              <Package className="h-3 w-3" />
              {schedule.assetName}
            </span>
          )}
          {schedule.vendorName && (
            <span
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Building2 className="h-3 w-3" />
              {schedule.vendorName}
            </span>
          )}
        </div>
      )}

      {/* Footer row: due status + action */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <DueStatusBadge schedule={schedule} />
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onMarkComplete(schedule);
          }}
        >
          Mark Complete
        </Button>
      </div>
    </div>
  );
}
