/**
 * Add Vendor Dialog
 *
 * Form dialog for creating a new vendor. Required fields: name, phone.
 * Optional fields collapsed in an expandable section.
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
import type { CreateVendorInput, VendorCategory } from '@protolabsai/types';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS: { value: VendorCategory; label: string }[] = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'general-contractor', label: 'General Contractor' },
  { value: 'painter', label: 'Painter' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// Component
// ============================================================================

interface AddVendorDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateVendorInput) => Promise<unknown>;
  isMutating: boolean;
}

interface FormState {
  name: string;
  phone: string;
  company: string;
  email: string;
  website: string;
  category: VendorCategory;
  rating: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  company: '',
  email: '',
  website: '',
  category: 'other',
  rating: '',
  notes: '',
};

export function AddVendorDialog({ open, onClose, onCreate, isMutating }: AddVendorDialogProps) {
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
    if (!form.phone.trim()) next.phone = 'Phone is required';
    if (form.rating) {
      const r = parseInt(form.rating, 10);
      if (isNaN(r) || r < 1 || r > 5) next.rating = 'Rating must be 1–5';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const input: CreateVendorInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      category: form.category,
      rating: form.rating ? parseInt(form.rating, 10) : null,
      notes: form.notes.trim(),
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
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Required: Name */}
          <div className="space-y-2">
            <Label htmlFor="add-vendor-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-vendor-name"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Mike Rodriguez"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Required: Phone */}
          <div className="space-y-2">
            <Label htmlFor="add-vendor-phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-vendor-phone"
              value={form.phone}
              onChange={set('phone')}
              placeholder="e.g. (555) 234-5678"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="add-vendor-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((prev) => ({ ...prev, category: v as VendorCategory }))}
            >
              <SelectTrigger id="add-vendor-category">
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
              <div className="space-y-2">
                <Label htmlFor="add-vendor-company">Company</Label>
                <Input
                  id="add-vendor-company"
                  value={form.company}
                  onChange={set('company')}
                  placeholder="e.g. Cool Comfort HVAC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-vendor-email">Email</Label>
                  <Input
                    id="add-vendor-email"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-vendor-rating">Rating (1–5)</Label>
                  <Input
                    id="add-vendor-rating"
                    type="number"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={set('rating')}
                    placeholder="e.g. 4"
                    aria-invalid={!!errors.rating}
                  />
                  {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-vendor-website">Website</Label>
                <Input
                  id="add-vendor-website"
                  type="url"
                  value={form.website}
                  onChange={set('website')}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-vendor-notes">Notes</Label>
                <Textarea
                  id="add-vendor-notes"
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
            Add Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
