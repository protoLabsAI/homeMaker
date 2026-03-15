import { useState } from 'react';
import { X, Clock, Building2, Package, DollarSign, User, Calendar, Edit2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SkeletonPulse,
} from '@protolabsai/ui/atoms';
import type {
  MaintenanceSchedule,
  MaintenanceCompletion,
  UpdateScheduleInput,
  MaintenanceCategory,
} from './hooks/use-maintenance';
import { useMaintenanceCompletions, useUpdateSchedule } from './hooks/use-maintenance';

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CompletionHistoryItem({ completion }: { completion: MaintenanceCompletion }) {
  return (
    <div className="flex flex-col gap-1.5 pb-4 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDate(completion.completedAt)}
        </div>
        {completion.actualCost != null && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCents(completion.actualCost)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        {completion.completedBy}
      </div>
      {completion.notes && <p className="text-sm text-foreground-secondary">{completion.notes}</p>}
    </div>
  );
}

interface EditFormProps {
  schedule: MaintenanceSchedule;
  onSave: (input: UpdateScheduleInput) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EditForm({ schedule, onSave, onCancel, isSaving }: EditFormProps) {
  const [title, setTitle] = useState(schedule.title);
  const [description, setDescription] = useState(schedule.description ?? '');
  const [category, setCategory] = useState<MaintenanceCategory>(schedule.category);
  const [intervalDays, setIntervalDays] = useState(String(schedule.intervalDays));
  const [estimatedCost, setEstimatedCost] = useState(
    schedule.estimatedCost != null ? String(schedule.estimatedCost / 100) : ''
  );

  const handleSave = () => {
    const parsed = parseInt(intervalDays, 10);
    if (!title.trim() || isNaN(parsed) || parsed < 1) return;
    const costCents = estimatedCost.trim() ? Math.round(parseFloat(estimatedCost) * 100) : null;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      intervalDays: parsed,
      estimatedCost: costCents,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as MaintenanceCategory)}>
          <SelectTrigger id="edit-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-interval">Interval (days)</Label>
        <Input
          id="edit-interval"
          type="number"
          min={1}
          value={intervalDays}
          onChange={(e) => setIntervalDays(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-cost">Estimated Cost</Label>
        <Input
          id="edit-cost"
          type="number"
          min={0}
          step={0.01}
          placeholder="0.00"
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} loading={isSaving}>
          Save
        </Button>
      </div>
    </div>
  );
}

interface ScheduleDetailPanelProps {
  schedule: MaintenanceSchedule | null;
  onClose: () => void;
}

export function ScheduleDetailPanel({ schedule, onClose }: ScheduleDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateSchedule = useUpdateSchedule();

  // Completion history — reverse chronological order
  const { data: completions = [], isLoading: loadingCompletions } = useMaintenanceCompletions(
    schedule?.id ?? null
  );

  // Sort completions in reverse chronological order
  const sortedCompletions = [...completions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const handleSave = (input: UpdateScheduleInput) => {
    if (!schedule) return;
    updateSchedule.mutate(
      { scheduleId: schedule.id, input },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  return (
    <Sheet open={!!schedule} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {schedule && (
          <>
            <SheetHeader className="flex flex-row items-center justify-between pr-0">
              <SheetTitle className="truncate pr-2">{schedule.title}</SheetTitle>
              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit schedule"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                <SheetClose asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="Close panel" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 mt-6">
              {isEditing ? (
                <EditForm
                  schedule={schedule}
                  onSave={handleSave}
                  onCancel={() => setIsEditing(false)}
                  isSaving={updateSchedule.isPending}
                />
              ) : (
                <>
                  {/* Details section */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Every {schedule.intervalDays} days</span>
                    </div>

                    {schedule.nextDueAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Next due: {formatDate(schedule.nextDueAt)}</span>
                      </div>
                    )}

                    {schedule.lastCompletedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Last completed: {formatDate(schedule.lastCompletedAt)}</span>
                      </div>
                    )}

                    {schedule.estimatedCost != null && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span>Est. cost: {formatCents(schedule.estimatedCost)}</span>
                      </div>
                    )}

                    {schedule.assetName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4 shrink-0" />
                        <span>{schedule.assetName}</span>
                        <Badge variant="muted" className="text-xs">
                          Asset
                        </Badge>
                      </div>
                    )}

                    {schedule.vendorName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{schedule.vendorName}</span>
                        <Badge variant="muted" className="text-xs">
                          Vendor
                        </Badge>
                      </div>
                    )}

                    {schedule.description && (
                      <p className="text-sm text-foreground-secondary">{schedule.description}</p>
                    )}
                  </div>

                  {/* Completion history timeline */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Completion History
                      {sortedCompletions.length > 0 && (
                        <span className="ml-2 text-muted-foreground font-normal">
                          ({sortedCompletions.length})
                        </span>
                      )}
                    </h3>

                    {loadingCompletions && (
                      <div className="space-y-3">
                        <SkeletonPulse className="h-12 w-full rounded" />
                        <SkeletonPulse className="h-12 w-full rounded" />
                      </div>
                    )}

                    {!loadingCompletions && sortedCompletions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No completions recorded yet.</p>
                    )}

                    {!loadingCompletions && sortedCompletions.length > 0 && (
                      <div className="flex flex-col gap-0">
                        {sortedCompletions.map((completion) => (
                          <CompletionHistoryItem key={completion.id} completion={completion} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
