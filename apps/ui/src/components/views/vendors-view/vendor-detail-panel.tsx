/**
 * Vendor Detail Panel
 *
 * Slide-out sheet showing all vendor fields with edit capability and delete.
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@protolabsai/ui/atoms';
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
import { Pencil, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vendor, UpdateVendorInput, VendorCategory } from '@protolabsai/types';

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
// Star picker sub-component
// ============================================================================

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starVal = i + 1;
        const filled = value !== null && starVal <= value;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === starVal ? null : starVal)}
            className={cn(
              'p-0.5 rounded transition-colors',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
            )}
            aria-label={`Rate ${starVal} star${starVal === 1 ? '' : 's'}`}
          >
            <Star
              className={cn(
                'size-5',
                filled ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground'
              )}
            />
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground ml-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

interface VendorDetailPanelProps {
  vendor: Vendor | null;
  onClose: () => void;
  onUpdate?: (id: string, updates: UpdateVendorInput) => Promise<Vendor | null>;
  onDeleted?: (id: string) => void;
  isMutating?: boolean;
}

export function VendorDetailPanel({
  vendor,
  onClose,
  onUpdate,
  onDeleted,
  isMutating = false,
}: VendorDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<VendorCategory>('other');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  // Sync state when vendor changes
  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setCompany(vendor.company ?? '');
      setPhone(vendor.phone);
      setEmail(vendor.email ?? '');
      setWebsite(vendor.website ?? '');
      setCategory(vendor.category);
      setNotes(vendor.notes);
      setRating(vendor.rating);
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [vendor]);

  const handleSave = async () => {
    if (!vendor || !onUpdate) return;

    const updates: UpdateVendorInput = {
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      website: website.trim() || null,
      category,
      notes: notes.trim(),
      rating,
    };

    const result = await onUpdate(vendor.id, updates);
    if (result) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor || !onDeleted) return;
    onDeleted(vendor.id);
    onClose();
  };

  const handleCancel = () => {
    if (vendor) {
      setName(vendor.name);
      setCompany(vendor.company ?? '');
      setPhone(vendor.phone);
      setEmail(vendor.email ?? '');
      setWebsite(vendor.website ?? '');
      setCategory(vendor.category);
      setNotes(vendor.notes);
      setRating(vendor.rating);
    }
    setIsEditing(false);
    setConfirmDelete(false);
  };

  return (
    <Sheet open={vendor !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{vendor?.name ?? 'Vendor'}</SheetTitle>
            <div className="flex items-center gap-1">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit vendor"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {!isEditing && onDeleted && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete vendor"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 px-6 py-4 space-y-4">
          {isEditing ? (
            <>
              {/* Edit form */}
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Name</Label>
                <Input
                  id="vendor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-company">Company</Label>
                <Input
                  id="vendor-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Optional"
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as VendorCategory)}
                  disabled={isMutating}
                >
                  <SelectTrigger id="vendor-category">
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
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-email">Email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-website">Website</Label>
                <Input
                  id="vendor-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Optional"
                  disabled={isMutating}
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <StarPicker value={rating} onChange={setRating} disabled={isMutating} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor-notes">Notes</Label>
                <Textarea
                  id="vendor-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isMutating}
                />
              </div>
            </>
          ) : (
            <>
              {/* Read-only view */}
              {vendor && (
                <div className="space-y-4">
                  {vendor.company && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Company</p>
                      <p className="text-sm text-foreground">{vendor.company}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                    <p className="text-sm text-foreground">
                      {CATEGORY_OPTIONS.find((o) => o.value === vendor.category)?.label ??
                        vendor.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <p className="text-sm text-foreground">{vendor.phone}</p>
                  </div>

                  {vendor.email && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <p className="text-sm text-foreground">{vendor.email}</p>
                    </div>
                  )}

                  {vendor.website && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Website</p>
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {vendor.website}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      {vendor.rating !== null ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'size-4',
                              i < (vendor.rating ?? 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-muted text-muted-foreground'
                            )}
                          />
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Unrated</span>
                      )}
                    </div>
                  </div>

                  {vendor.lastServiceDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Last Service</p>
                      <p className="text-sm text-foreground">
                        {new Date(vendor.lastServiceDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}

                  {vendor.lastContactedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Last Contacted</p>
                      <p className="text-sm text-foreground">
                        {new Date(vendor.lastContactedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}

                  {vendor.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{vendor.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-foreground font-medium">Delete this vendor?</p>
              <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} loading={isMutating}>
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isMutating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <SheetFooter className="px-6 py-4 border-t border-border">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isMutating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} loading={isMutating} className="flex-1">
                Save
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
