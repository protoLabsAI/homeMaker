/**
 * Add Asset Dialog
 *
 * Form dialog with all asset fields. Required fields are shown by default;
 * optional fields are collapsed in an expandable section.
 */

import { useState, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@protolabsai/ui/atoms';
import {
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
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CreateAssetInput, AssetCategory } from '@protolabsai/types';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'appliance', label: 'Appliance' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'structural', label: 'Structural' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// Component
// ============================================================================

interface AddAssetDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateAssetInput) => Promise<unknown>;
  isMutating: boolean;
}

interface FormState {
  name: string;
  category: AssetCategory;
  location: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  warrantyExpiration: string;
  replacementCost: string;
  manualUrl: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  category: 'other',
  location: '',
  manufacturer: '',
  modelNumber: '',
  serialNumber: '',
  purchaseDate: '',
  purchasePrice: '',
  warrantyExpiration: '',
  replacementCost: '',
  manualUrl: '',
  notes: '',
};

export function AddAssetDialog({ open, onClose, onCreate, isMutating }: AddAssetDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [showOptional, setShowOptional] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set =
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.location.trim()) next.location = 'Location is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const input: CreateAssetInput = {
      name: form.name.trim(),
      category: form.category,
      location: form.location.trim(),
      manufacturer: form.manufacturer.trim() || null,
      modelNumber: form.modelNumber.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      purchaseDate: form.purchaseDate || null,
      purchasePrice: form.purchasePrice ? Math.round(parseFloat(form.purchasePrice) * 100) : null,
      warrantyExpiration: form.warrantyExpiration || null,
      replacementCost: form.replacementCost
        ? Math.round(parseFloat(form.replacementCost) * 100)
        : null,
      manualUrl: form.manualUrl.trim() || null,
      notes: form.notes.trim() || null,
      sensorIds: [],
      photoUrls: [],
    };

    await onCreate(input);
    setForm(INITIAL_FORM);
    setShowOptional(false);
    onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setForm(INITIAL_FORM);
      setErrors({});
      setShowOptional(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Required fields */}
          <div className="space-y-2">
            <Label htmlFor="add-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-name"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Kitchen Refrigerator"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((prev) => ({ ...prev, category: v as AssetCategory }))}
            >
              <SelectTrigger id="add-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-location"
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Kitchen, Garage, Living Room"
              aria-invalid={!!errors.location}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          {/* Optional fields toggle */}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="h-auto px-0 gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            {showOptional ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Optional fields
          </Button>

          {showOptional && (
            <div className="space-y-4 border-l-2 border-border pl-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-manufacturer">Manufacturer</Label>
                  <Input
                    id="add-manufacturer"
                    value={form.manufacturer}
                    onChange={set('manufacturer')}
                    placeholder="e.g. Samsung"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-model">Model Number</Label>
                  <Input id="add-model" value={form.modelNumber} onChange={set('modelNumber')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-serial">Serial Number</Label>
                <Input id="add-serial" value={form.serialNumber} onChange={set('serialNumber')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-purchase-date">Purchase Date</Label>
                  <Input
                    id="add-purchase-date"
                    type="date"
                    value={form.purchaseDate}
                    onChange={set('purchaseDate')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-purchase-price">Purchase Price ($)</Label>
                  <Input
                    id="add-purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={set('purchasePrice')}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-warranty">Warranty Expiration</Label>
                  <Input
                    id="add-warranty"
                    type="date"
                    value={form.warrantyExpiration}
                    onChange={set('warrantyExpiration')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-replacement-cost">Replacement Cost ($)</Label>
                  <Input
                    id="add-replacement-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.replacementCost}
                    onChange={set('replacementCost')}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-manual-url">Manual URL</Label>
                <Input
                  id="add-manual-url"
                  type="url"
                  value={form.manualUrl}
                  onChange={set('manualUrl')}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={form.notes}
                  onChange={set('notes')}
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} loading={isMutating}>
            Add Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
