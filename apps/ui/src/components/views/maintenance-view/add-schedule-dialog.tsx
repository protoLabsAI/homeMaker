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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@protolabsai/ui/atoms';
import type { CreateScheduleInput, MaintenanceCategory } from './hooks/use-maintenance';

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

const INTERVAL_PRESETS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '365 days', value: 365 },
];

interface AddScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateScheduleInput) => void;
  isSubmitting: boolean;
}

export function AddScheduleDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: AddScheduleDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [intervalDays, setIntervalDays] = useState<number>(90);
  const [intervalInput, setIntervalInput] = useState('90');
  const [category, setCategory] = useState<MaintenanceCategory>('other');
  const [estimatedCost, setEstimatedCost] = useState('');

  const handlePreset = (days: number) => {
    setIntervalDays(days);
    setIntervalInput(String(days));
  };

  const handleIntervalChange = (val: string) => {
    setIntervalInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setIntervalDays(parsed);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !category || intervalDays < 1) return;
    const costCents = estimatedCost.trim()
      ? Math.round(parseFloat(estimatedCost) * 100)
      : undefined;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      intervalDays,
      estimatedCost: costCents ?? null,
    });
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIntervalDays(90);
    setIntervalInput('90');
    setCategory('other');
    setEstimatedCost('');
    onClose();
  };

  const isValid = title.trim().length > 0 && intervalDays >= 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Maintenance Schedule</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="schedule-title">Title</Label>
            <Input
              id="schedule-title"
              placeholder="e.g. Change HVAC filter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="schedule-description">Description (optional)</Label>
            <Textarea
              id="schedule-description"
              placeholder="Additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="schedule-interval">Interval (days)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {INTERVAL_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={intervalDays === preset.value ? 'default' : 'outline'}
                  onClick={() => handlePreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              id="schedule-interval"
              type="number"
              min={1}
              placeholder="Custom days"
              value={intervalInput}
              onChange={(e) => handleIntervalChange(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="schedule-category">Category</Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as MaintenanceCategory)}
            >
              <SelectTrigger id="schedule-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated cost */}
          <div className="space-y-2">
            <Label htmlFor="schedule-cost">Estimated Cost (optional)</Label>
            <Input
              id="schedule-cost"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} loading={isSubmitting}>
            Add Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
