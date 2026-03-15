import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
} from '@protolabsai/ui/atoms';
import type { MaintenanceSchedule, CompleteScheduleInput } from './hooks/use-maintenance';

interface CompleteDialogProps {
  open: boolean;
  schedule: MaintenanceSchedule | null;
  onClose: () => void;
  onSubmit: (scheduleId: string, input: CompleteScheduleInput) => void;
  isSubmitting: boolean;
}

export function CompleteDialog({
  open,
  schedule,
  onClose,
  onSubmit,
  isSubmitting,
}: CompleteDialogProps) {
  const [completedBy, setCompletedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [actualCost, setActualCost] = useState('');

  const handleSubmit = () => {
    if (!schedule || !completedBy.trim()) return;
    const costCents = actualCost.trim() ? Math.round(parseFloat(actualCost) * 100) : null;
    // POST complete endpoint: /api/maintenance/schedules/:id/complete
    onSubmit(schedule.id, {
      completedBy: completedBy.trim(),
      notes: notes.trim() || undefined,
      actualCost: costCents,
    });
  };

  const handleClose = () => {
    setCompletedBy('');
    setNotes('');
    setActualCost('');
    onClose();
  };

  const isValid = completedBy.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Complete: {schedule?.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Who completed it */}
          <div className="space-y-2">
            <Label htmlFor="completed-by">Who completed it</Label>
            <Input
              id="completed-by"
              placeholder="e.g. Josh"
              value={completedBy}
              onChange={(e) => setCompletedBy(e.target.value)}
              autoFocus
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Notes (optional)</Label>
            <Textarea
              id="completion-notes"
              placeholder="Any observations or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actual cost */}
          <div className="space-y-2">
            <Label htmlFor="actual-cost">Actual Cost (optional)</Label>
            <Input
              id="actual-cost"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} loading={isSubmitting}>
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
