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
import type { CreateVendorInput, VendorCategory } from '@protolabsai/types';

const CATEGORIES: { value: VendorCategory; label: string }[] = [
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

interface AddVendorDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVendorInput) => void;
  isSubmitting: boolean;
}

export function AddVendorDialog({ open, onClose, onSubmit, isSubmitting }: AddVendorDialogProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<VendorCategory>('other');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');

  const handleClose = () => {
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setCategory('other');
    setRating('');
    setNotes('');
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return;
    const parsedRating = rating.trim() ? parseInt(rating, 10) : null;
    const validRating =
      parsedRating !== null && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : null;

    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      category,
      company: company.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      notes: notes.trim(),
      rating: validRating,
    });
  };

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Name *</Label>
            <Input
              id="vendor-name"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-company">Company</Label>
            <Input
              id="vendor-company"
              placeholder="Smith Plumbing LLC"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-phone">Phone *</Label>
            <Input
              id="vendor-phone"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-email">Email</Label>
            <Input
              id="vendor-email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-website">Website</Label>
            <Input
              id="vendor-website"
              placeholder="https://smithplumbing.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as VendorCategory)}>
              <SelectTrigger id="vendor-category">
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
            <Label htmlFor="vendor-rating">Rating (1–5)</Label>
            <Input
              id="vendor-rating"
              type="number"
              min={1}
              max={5}
              placeholder="Leave blank if unrated"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-notes">Notes</Label>
            <Textarea
              id="vendor-notes"
              placeholder="Any additional notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!isValid}>
            Add Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
