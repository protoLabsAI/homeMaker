import { useState } from 'react';
import { CalendarClock, Plus, Wrench, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { PanelHeader } from '@/components/shared/panel-header';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SkeletonPulse,
} from '@protolabsai/ui/atoms';
import {
  useMaintenanceSchedules,
  useCreateSchedule,
  useCompleteSchedule,
  isOverdue,
  isDueThisWeek,
  isDueThisMonth,
  isUpToDate,
} from './hooks/use-maintenance';
import { useGamificationProfile } from '@/components/views/profile-view/hooks/use-gamification';
import type {
  MaintenanceSchedule,
  CreateScheduleInput,
  CompleteScheduleInput,
} from './hooks/use-maintenance';
import { ScheduleCard } from './schedule-card';
import { AddScheduleDialog } from './add-schedule-dialog';
import { CompleteDialog } from './complete-dialog';
import { ScheduleDetailPanel } from './schedule-detail-panel';
import { DueSummary } from './due-summary';

type FilterTab = 'all' | 'overdue' | 'due-this-week' | 'due-this-month' | 'up-to-date';

function filterSchedules(schedules: MaintenanceSchedule[], tab: FilterTab): MaintenanceSchedule[] {
  switch (tab) {
    case 'overdue':
      return schedules.filter(isOverdue);
    case 'due-this-week':
      return schedules.filter(isDueThisWeek);
    case 'due-this-month':
      return schedules.filter(isDueThisMonth);
    case 'up-to-date':
      return schedules.filter(isUpToDate);
    default:
      return schedules;
  }
}

export function MaintenanceView() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceSchedule | null>(null);
  const [detailTarget, setDetailTarget] = useState<MaintenanceSchedule | null>(null);

  const { data: schedules = [], isLoading, error } = useMaintenanceSchedules();
  const { data: gamificationProfile } = useGamificationProfile();

  const createSchedule = useCreateSchedule();
  const completeSchedule = useCompleteSchedule();

  const filtered = filterSchedules(schedules, activeTab);

  const handleCreate = (input: CreateScheduleInput) => {
    createSchedule.mutate(input, {
      onSuccess: () => {
        setShowAddDialog(false);
        toast.success('Schedule added');
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to add schedule');
      },
    });
  };

  const handleComplete = (scheduleId: string, input: CompleteScheduleInput) => {
    completeSchedule.mutate(
      { scheduleId, input },
      {
        onSuccess: (data) => {
          setCompleteTarget(null);
          // Update detail panel with refreshed schedule data
          if (detailTarget?.id === scheduleId) {
            setDetailTarget(data.schedule);
          }
          toast.success('Marked as complete. Next due date updated.');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to mark complete');
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={CalendarClock}
        title="Maintenance"
        extra={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Due summary cards */}
        {!isLoading && schedules.length > 0 && (
          <DueSummary
            schedules={schedules}
            activeFilter={activeTab}
            onFilterChange={setActiveTab}
          />
        )}

        {/* Maintenance streak indicator */}
        {gamificationProfile && (
          <div className="flex items-center gap-2 px-1">
            <Flame
              className={`w-4 h-4 ${gamificationProfile.streaks.maintenance.current > 0 ? 'text-status-warning' : 'text-muted-foreground'}`}
            />
            <span
              className={`text-sm font-medium ${gamificationProfile.streaks.maintenance.current > 0 ? 'text-status-warning' : 'text-muted-foreground'}`}
            >
              {gamificationProfile.streaks.maintenance.current} day streak
            </span>
            {gamificationProfile.streaks.maintenance.best > 0 && (
              <span className="text-xs text-muted-foreground">
                (best: {gamificationProfile.streaks.maintenance.best})
              </span>
            )}
          </div>
        )}

        {/* Status filter tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="due-this-week">Due This Week</TabsTrigger>
            <TabsTrigger value="due-this-month">Due This Month</TabsTrigger>
            <TabsTrigger value="up-to-date">Up to Date</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {/* Loading state */}
            {isLoading && (
              <div className="space-y-3">
                <SkeletonPulse className="h-24 w-full rounded-lg" />
                <SkeletonPulse className="h-24 w-full rounded-lg" />
                <SkeletonPulse className="h-24 w-full rounded-lg" />
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="text-sm text-destructive py-8 text-center">
                Failed to load maintenance schedules.
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && schedules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Wrench className="h-10 w-10 opacity-30" />
                <p className="text-sm">No maintenance schedules yet.</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add your first schedule
                </Button>
              </div>
            )}

            {/* Filtered empty state */}
            {!isLoading && !error && schedules.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <p className="text-sm">No schedules match this filter.</p>
              </div>
            )}

            {/* Schedule list */}
            {!isLoading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onMarkComplete={(s) => setCompleteTarget(s)}
                    onViewDetails={(s) => setDetailTarget(s)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add schedule dialog */}
      <AddScheduleDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleCreate}
        isSubmitting={createSchedule.isPending}
      />

      {/* Complete schedule dialog */}
      <CompleteDialog
        open={!!completeTarget}
        schedule={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onSubmit={handleComplete}
        isSubmitting={completeSchedule.isPending}
      />

      {/* Schedule detail panel */}
      <ScheduleDetailPanel schedule={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
