import { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  Globe,
  Star,
  Calendar,
  Building2,
  Package,
  Edit2,
  Trash2,
} from 'lucide-react';
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
} from '@protolabsai/ui/atoms';
import type { Vendor, UpdateVendorInput, VendorCategory } from '@protolabsai/types';
import { useUpdateVendor, useDeleteVendor } from './hooks/use-vendors';

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

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StarRatingDisplay({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-sm text-muted-foreground">Unrated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-status-warning text-status-warning' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
}

interface EditFormProps {
  vendor: Vendor;
  onSave: (input: UpdateVendorInput) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EditForm({ vendor, onSave, onCancel, isSaving }: EditFormProps) {
  const [name, setName] = useState(vendor.name);
  const [company, setCompany] = useState(vendor.company ?? '');
  const [phone, setPhone] = useState(vendor.phone);
  const [email, setEmail] = useState(vendor.email ?? '');
  const [website, setWebsite] = useState(vendor.website ?? '');
  const [category, setCategory] = useState<VendorCategory>(vendor.category);
  const [rating, setRating] = useState(vendor.rating !== null ? String(vendor.rating) : '');
  const [notes, setNotes] = useState(vendor.notes);

  const handleSave = () => {
    if (!name.trim() || !phone.trim()) return;
    const parsedRating = rating.trim() ? parseInt(rating, 10) : null;
    const validRating =
      parsedRating !== null && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : null;

    onSave({
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

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-name">Name</Label>
        <Input id="edit-vendor-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-company">Company</Label>
        <Input
          id="edit-vendor-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-phone">Phone</Label>
        <Input id="edit-vendor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-email">Email</Label>
        <Input
          id="edit-vendor-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-website">Website</Label>
        <Input
          id="edit-vendor-website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as VendorCategory)}>
          <SelectTrigger id="edit-vendor-category">
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
        <Label htmlFor="edit-vendor-rating">Rating (1–5)</Label>
        <Input
          id="edit-vendor-rating"
          type="number"
          min={1}
          max={5}
          placeholder="Leave blank if unrated"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-vendor-notes">Notes</Label>
        <Textarea
          id="edit-vendor-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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

interface VendorDetailPanelProps {
  vendor: Vendor | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function VendorDetailPanel({ vendor, onClose, onDeleted }: VendorDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const handleSave = (input: UpdateVendorInput) => {
    if (!vendor) return;
    updateVendor.mutate(
      { vendorId: vendor.id, input },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleDelete = () => {
    if (!vendor) return;
    deleteVendor.mutate(vendor.id, {
      onSuccess: () => {
        onClose();
        onDeleted();
      },
    });
  };

  return (
    <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {vendor && (
          <>
            <SheetHeader className="flex flex-row items-center justify-between pr-0">
              <SheetTitle className="truncate pr-2">{vendor.name}</SheetTitle>
              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit vendor"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete vendor"
                      onClick={handleDelete}
                      disabled={deleteVendor.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
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
                  vendor={vendor}
                  onSave={handleSave}
                  onCancel={() => setIsEditing(false)}
                  isSaving={updateVendor.isPending}
                />
              ) : (
                <>
                  {/* Details */}
                  <div className="flex flex-col gap-3">
                    {vendor.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{vendor.company}</span>
                      </div>
                    )}

                    <div>
                      <Badge variant="muted" className="text-xs">
                        {CATEGORY_LABELS[vendor.category]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={`tel:${vendor.phone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {vendor.phone}
                      </a>
                    </div>

                    {vendor.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                          {vendor.email}
                        </a>
                      </div>
                    )}

                    {vendor.website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {vendor.website}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <StarRatingDisplay rating={vendor.rating} />
                    </div>

                    {vendor.lastServiceDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Last service: {formatDate(vendor.lastServiceDate)}</span>
                      </div>
                    )}

                    {vendor.lastContactedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Last contacted: {formatDate(vendor.lastContactedAt)}</span>
                      </div>
                    )}

                    {vendor.notes && (
                      <p className="text-sm text-foreground-secondary mt-1">{vendor.notes}</p>
                    )}
                  </div>

                  {/* Linked assets */}
                  {vendor.linkedAssetIds.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Linked Assets
                        <span className="ml-2 text-muted-foreground font-normal">
                          ({vendor.linkedAssetIds.length})
                        </span>
                      </h3>
                      <div className="flex flex-col gap-2">
                        {vendor.linkedAssetIds.map((assetId) => (
                          <div
                            key={assetId}
                            className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md bg-muted"
                          >
                            <Package className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-mono text-xs truncate">{assetId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
