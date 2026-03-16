import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/lib/api-fetch';

// --- Types ---

export type MaintenanceCategory =
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'appliance'
  | 'exterior'
  | 'interior'
  | 'landscaping'
  | 'pest-control'
  | 'safety'
  | 'other';

export interface MaintenanceSchedule {
  id: string;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  assetId?: string | null;
  assetName?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  estimatedCost?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceCompletion {
  id: string;
  scheduleId: string;
  completedAt: string;
  completedBy: string;
  notes?: string | null;
  actualCost?: number | null;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  category: MaintenanceCategory;
  intervalDays: number;
  assetId?: string | null;
  vendorId?: string | null;
  estimatedCost?: number | null;
}

export interface CompleteScheduleInput {
  completedBy: string;
  notes?: string;
  actualCost?: number | null;
}

export interface UpdateScheduleInput {
  title?: string;
  description?: string;
  category?: MaintenanceCategory;
  intervalDays?: number;
  assetId?: string | null;
  vendorId?: string | null;
  estimatedCost?: number | null;
}

// --- Due status helpers ---

export type DueStatus = 'overdue' | 'due-soon' | 'upcoming';

export interface DueInfo {
  status: DueStatus;
  daysOverdue?: number;
  daysUntilDue?: number;
  nextDueAt: Date | null;
}

export function getDueInfo(schedule: MaintenanceSchedule): DueInfo {
  if (!schedule.nextDueAt) {
    return { status: 'upcoming', nextDueAt: null };
  }

  const now = new Date();
  const due = new Date(schedule.nextDueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'overdue', daysOverdue: Math.abs(diffDays), nextDueAt: due };
  }
  if (diffDays <= 7) {
    return { status: 'due-soon', daysUntilDue: diffDays, nextDueAt: due };
  }
  return { status: 'upcoming', daysUntilDue: diffDays, nextDueAt: due };
}

export function isOverdue(schedule: MaintenanceSchedule): boolean {
  return getDueInfo(schedule).status === 'overdue';
}

export function isDueSoon(schedule: MaintenanceSchedule): boolean {
  return getDueInfo(schedule).status === 'due-soon';
}

export function isDueThisWeek(schedule: MaintenanceSchedule): boolean {
  const info = getDueInfo(schedule);
  return info.status === 'due-soon';
}

export function isDueThisMonth(schedule: MaintenanceSchedule): boolean {
  if (!schedule.nextDueAt) return false;
  const now = new Date();
  const due = new Date(schedule.nextDueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 7 && diffDays <= 30;
}

export function isUpToDate(schedule: MaintenanceSchedule): boolean {
  if (!schedule.nextDueAt) return true;
  const now = new Date();
  const due = new Date(schedule.nextDueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 30;
}

// --- Query keys ---

const QUERY_KEYS = {
  schedules: ['maintenance', 'schedules'] as const,
  completions: (scheduleId: string) => ['maintenance', 'completions', scheduleId] as const,
};

// --- API response types ---

interface SchedulesResponse {
  success: boolean;
  schedules: MaintenanceSchedule[];
}

interface ScheduleResponse {
  success: boolean;
  schedule: MaintenanceSchedule;
}

interface CompletionsResponse {
  success: boolean;
  completions: MaintenanceCompletion[];
}

interface CompletionResponse {
  success: boolean;
  completion: MaintenanceCompletion;
  schedule: MaintenanceSchedule;
}

// --- Hooks ---

export function useMaintenanceSchedules() {
  return useQuery({
    queryKey: QUERY_KEYS.schedules,
    queryFn: async (): Promise<MaintenanceSchedule[]> => {
      const result = await apiGet<SchedulesResponse>('/api/maintenance');
      if (!result?.success) throw new Error('Failed to fetch maintenance schedules');
      return result.schedules ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useMaintenanceCompletions(scheduleId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.completions(scheduleId ?? ''),
    queryFn: async (): Promise<MaintenanceCompletion[]> => {
      if (!scheduleId) throw new Error('No schedule ID');
      const result = await apiGet<CompletionsResponse>(
        `/api/maintenance/${scheduleId}/completions`
      );
      if (!result?.success) throw new Error('Failed to fetch completion history');
      return result.completions ?? [];
    },
    enabled: !!scheduleId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateScheduleInput): Promise<MaintenanceSchedule> => {
      const result = await apiPost<ScheduleResponse>('/api/maintenance', input);
      if (!result?.success) throw new Error('Failed to create schedule');
      return result.schedule;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
    },
  });
}

export function useCompleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      scheduleId,
      input,
    }: {
      scheduleId: string;
      input: CompleteScheduleInput;
    }): Promise<{ completion: MaintenanceCompletion; schedule: MaintenanceSchedule }> => {
      const result = await apiPost<CompletionResponse>(
        `/api/maintenance/${scheduleId}/complete`,
        input
      );
      if (!result?.success) throw new Error('Failed to complete schedule');
      return { completion: result.completion, schedule: result.schedule };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.completions(variables.scheduleId),
      });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      scheduleId,
      input,
    }: {
      scheduleId: string;
      input: UpdateScheduleInput;
    }): Promise<MaintenanceSchedule> => {
      const result = await apiPut<ScheduleResponse>(`/api/maintenance/${scheduleId}`, input);
      if (!result?.success) throw new Error('Failed to update schedule');
      return result.schedule;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules });
    },
  });
}
