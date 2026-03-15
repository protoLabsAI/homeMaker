/**
 * Vendor Detail Panel
 *
 * Slide-out sheet showing all vendor fields, edit capability, linked assets,
 * and a delete confirmation. Mutations are handled internally via apiFetch.
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@protolabsai/ui/atoms';
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
  Badge,
} from '@protolabsai/ui/atoms';
import { Pencil, Trash2, Phone, Mail, Globe, Star, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
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

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  plumber: 'Plumber',
  electrician: 'Electrician',
  hvac: 'HVAC',
  landscaper: 'Landscaper',
  'general-contractor': 'General Contractor',
  painter: 'Painter',
  roofer: 'Roofer',
  'pest-control': 'Pest Control',
  cleaning: 'Cleaning',
  insurance: 'Insurance',
  other: 'Other',
};

// ============================================================================
// Component
// ============================================================================

interface VendorDetailPanelProps {
  vendor: Vendor | null;
  onClose: () => void;
  onDeleted: () => void;
}

interface VendorMutationResponse {
  success: boolean;
  data?: Vendor;
  error?: string;
}

interface VendorDeleteResponse {
  success: boolean;
  error?: string;
}

export function VendorDetailPanel({ vendor, onClose, onDeleted }: VendorDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editCategory, setEditCategory] = useState<VendorCategory>('other');
  const [editRating, setEditRating] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Populate edit form when vendor changes
  useEffect(() => {
    if (vendor) {
      setEditName(vendor.name);
      setEditPhone(vendor.phone);
      setEditCompany(vendor.company ?? '');
      setEditEmail(vendor.email ?? '');
      setEditWebsite(vendor.website ?? '');
      setEditCategory(vendor.category);
      setEditRating(vendor.rating != null ? String(vendor.rating) : '');
      setEditNotes(vendor.notes ?? '');
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [vendor?.id]);

  const handleSave = async () => {
    if (!vendor) return;

    const updates: UpdateVendorInput = {
      name: editName,
      phone: editPhone,
      company: editCompany || null,
      email: editEmail || null,
      website: editWebsite || null,
      category: editCategory,
      rating: editRating ? parseInt(editRating, 10) : null,
      notes: editNotes,
    };

    setIsMutating(true);
    try {
      const response = await apiFetch(`/api/vendors/${vendor.id}`, 'PATCH', { body: updates });
      const result: VendorMutationResponse = await response.json();
      if (result.success) {
        setIsEditing(false);
        onClose();
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor) return;

    setIsMutating(true);
    try {
      const response = await apiFetch(`/api/vendors/${vendor.id}`, 'DELETE');
      const result: VendorDeleteResponse = await response.json();
      if (result.success) {
        onDeleted();
      }
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <Sheet open={vendor !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {vendor && (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-2">
                <SheetTitle className="text-base">{vendor.name}</SheetTitle>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsEditing(!isEditing)}
                    aria-label="Edit vendor"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete vendor"
                    className="hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-6">
              {isEditing ? (
                // ── Edit form ─────────────────────────────────────────────────
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-name">Name</Label>
                    <Input
                      id="edit-vendor-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-phone">Phone</Label>
                    <Input
                      id="edit-vendor-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-company">Company</Label>
                    <Input
                      id="edit-vendor-company"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-category">Category</Label>
                    <Select
                      value={editCategory}
                      onValueChange={(v) => setEditCategory(v as VendorCategory)}
                    >
                      <SelectTrigger id="edit-vendor-category">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-vendor-email">Email</Label>
                      <Input
                        id="edit-vendor-email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-vendor-rating">Rating (1–5)</Label>
                      <Input
                        id="edit-vendor-rating"
                        type="number"
                        min="1"
                        max="5"
                        value={editRating}
                        onChange={(e) => setEditRating(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-website">Website</Label>
                    <Input
                      id="edit-vendor-website"
                      type="url"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-notes">Notes</Label>
                    <Textarea
                      id="edit-vendor-notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} loading={isMutating} className="flex-1">
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // ── Read-only view ─────────────────────────────────────────
                <div className="space-y-4">
                  <DetailRow label="Category">
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[vendor.category] ?? vendor.category}
                    </Badge>
                  </DetailRow>

                  <DetailRow label="Phone">
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="size-3" />
                      {vendor.phone}
                    </a>
                  </DetailRow>

                  {vendor.company && (
                    <DetailRow label="Company">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3" />
                        {vendor.company}
                      </span>
                    </DetailRow>
                  )}

                  {vendor.email && (
                    <DetailRow label="Email">
                      <a
                        href={`mailto:${vendor.email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="size-3" />
                        {vendor.email}
                      </a>
                    </DetailRow>
                  )}

                  {vendor.website && (
                    <DetailRow label="Website">
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe className="size-3" />
                        Visit site
                      </a>
                    </DetailRow>
                  )}

                  <DetailRow label="Rating">
                    {vendor.rating !== null ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'size-3.5',
                              i < (vendor.rating ?? 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground'
                            )}
                          />
                        ))}
                        <span className="ml-1 text-sm text-muted-foreground">
                          {vendor.rating}/5
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">Unrated</span>
                    )}
                  </DetailRow>

                  {vendor.lastServiceDate && (
                    <DetailRow label="Last Service">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {new Date(vendor.lastServiceDate).toLocaleDateString()}
                      </span>
                    </DetailRow>
                  )}

                  {vendor.lastContactedAt && (
                    <DetailRow label="Last Contact">
                      {new Date(vendor.lastContactedAt).toLocaleDateString()}
                    </DetailRow>
                  )}

                  {vendor.notes && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Notes
                      </p>
                      <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                        {vendor.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Linked assets ────────────────────────────────────────── */}
              {vendor.linkedAssetIds.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Linked Assets
                  </p>
                  <div className="space-y-1">
                    {vendor.linkedAssetIds.map((assetId) => (
                      <div
                        key={assetId}
                        className="text-sm text-foreground-secondary font-mono text-xs bg-muted rounded px-2 py-1"
                      >
                        {assetId}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Delete confirmation ──────────────────────────────────── */}
              {confirmDelete && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm text-foreground">
                    Delete <strong>{vendor.name}</strong>? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      loading={isMutating}
                    >
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-muted-foreground shrink-0 w-28">{label}</p>
      <div className="text-sm text-foreground text-right">{children}</div>
    </div>
  );
}
