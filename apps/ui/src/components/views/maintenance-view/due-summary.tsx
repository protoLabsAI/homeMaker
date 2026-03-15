import type { ElementType } from 'react';
import { AlertTriangle, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@protolabsai/ui/atoms';
import type { MaintenanceSchedule } from './hooks/use-maintenance';
import { isOverdue, isDueThisWeek, isDueThisMonth, isUpToDate } from './hooks/use-maintenance';

interface DueSummaryCounts {
  overdueCount: number;
  dueThisWeekCount: number;
  dueThisMonthCount: number;
  upToDateCount: number;
}

export function computeDueSummary(schedules: MaintenanceSchedule[]): DueSummaryCounts {
  let overdueCount = 0;
  let dueThisWeekCount = 0;
  let dueThisMonthCount = 0;
  let upToDateCount = 0;

  for (const s of schedules) {
    if (isOverdue(s)) {
      overdueCount++;
    } else if (isDueThisWeek(s)) {
      dueThisWeekCount++;
    } else if (isDueThisMonth(s)) {
      dueThisMonthCount++;
    } else if (isUpToDate(s)) {
      upToDateCount++;
    }
  }

  return { overdueCount, dueThisWeekCount, dueThisMonthCount, upToDateCount };
}

interface SummaryCardProps {
  label: string;
  count: number;
  icon: ElementType;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
  active?: boolean;
}

function SummaryCard({
  label,
  count,
  icon: Icon,
  colorClass,
  bgClass,
  onClick,
  active,
}: SummaryCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${active ? 'ring-2 ring-ring' : 'hover:border-ring/50'}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgClass}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div>
          <div className={`text-2xl font-bold ${colorClass}`}>{count}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type FilterTab = 'all' | 'overdue' | 'due-this-week' | 'due-this-month' | 'up-to-date';

interface DueSummaryProps {
  schedules: MaintenanceSchedule[];
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
}

export function DueSummary({ schedules, activeFilter, onFilterChange }: DueSummaryProps) {
  const { overdueCount, dueThisWeekCount, dueThisMonthCount, upToDateCount } =
    computeDueSummary(schedules);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard
        label="Overdue"
        count={overdueCount}
        icon={AlertTriangle}
        colorClass="text-status-error"
        bgClass="bg-status-error-bg"
        onClick={() => onFilterChange(activeFilter === 'overdue' ? 'all' : 'overdue')}
        active={activeFilter === 'overdue'}
      />
      <SummaryCard
        label="Due This Week"
        count={dueThisWeekCount}
        icon={Clock}
        colorClass="text-status-warning"
        bgClass="bg-status-warning-bg"
        onClick={() => onFilterChange(activeFilter === 'due-this-week' ? 'all' : 'due-this-week')}
        active={activeFilter === 'due-this-week'}
      />
      <SummaryCard
        label="Due This Month"
        count={dueThisMonthCount}
        icon={CalendarDays}
        colorClass="text-status-info"
        bgClass="bg-status-info-bg"
        onClick={() => onFilterChange(activeFilter === 'due-this-month' ? 'all' : 'due-this-month')}
        active={activeFilter === 'due-this-month'}
      />
      <SummaryCard
        label="Up to Date"
        count={upToDateCount}
        icon={CheckCircle2}
        colorClass="text-status-success"
        bgClass="bg-status-success-bg"
        onClick={() => onFilterChange(activeFilter === 'up-to-date' ? 'all' : 'up-to-date')}
        active={activeFilter === 'up-to-date'}
      />
    </div>
  );
}
