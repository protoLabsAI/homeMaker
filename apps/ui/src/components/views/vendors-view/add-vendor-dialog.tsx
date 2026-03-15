/**
 * Add Vendor Dialog
 *
 * Modal dialog for creating a new vendor in the directory.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  isMutating?: boolean;
}

export function AddVendorDialog({
  open,
  onClose,
  onCreate,
  isMutating = false,
}: AddVendorDialogProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<VendorCategory>('other');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setCategory('other');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;

    const input: CreateVendorInput = {
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      website: website.trim() || null,
      category,
      notes: notes.trim(),
    };

    await onCreate(input);
    handleClose();
  };

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="add-vendor-name">Name *</Label>
            <Input
              id="add-vendor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              disabled={isMutating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-vendor-company">Company</Label>
            <Input
              id="add-vendor-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Smith Plumbing Co."
              disabled={isMutating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-vendor-category">Category *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as VendorCategory)}
              disabled={isMutating}
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

          <div className="space-y-2">
            <Label htmlFor="add-vendor-phone">Phone *</Label>
            <Input
              id="add-vendor-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isMutating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-vendor-email">Email</Label>
            <Input
              id="add-vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@smithplumbing.com"
              disabled={isMutating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-vendor-website">Website</Label>
            <Input
              id="add-vendor-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://smithplumbing.com"
              disabled={isMutating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-vendor-notes">Notes</Label>
            <Textarea
              id="add-vendor-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this vendor..."
              rows={3}
              disabled={isMutating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} loading={isMutating}>
            Add Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
