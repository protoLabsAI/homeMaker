/**
 * Asset Detail Panel
 *
 * Slide-out sheet showing all asset fields, edit capability, and linked
 * sensor readings when sensorIds are present.
 */

import { useState, useEffect, type ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
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
import { Badge } from '@protolabsai/ui/atoms';
import { Pencil, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api-fetch';
import type { Asset, UpdateAssetInput, AssetCategory } from '@protolabsai/types';

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

interface SensorReading {
  sensorId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  online: boolean;
}

interface SensorReadingsResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    type: string;
    online: boolean;
    lastReading?: { value: number; unit: string; timestamp: string };
  }[];
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

interface AssetDetailPanelProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: UpdateAssetInput) => Promise<Asset | null>;
  onDelete: (id: string) => Promise<boolean>;
  isMutating: boolean;
}

export function AssetDetailPanel({
  asset,
  open,
  onClose,
  onUpdate,
  onDelete,
  isMutating,
}: AssetDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [sensorsLoading, setSensorsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<AssetCategory>('other');
  const [editLocation, setEditLocation] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editModelNumber, setEditModelNumber] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editWarrantyExpiration, setEditWarrantyExpiration] = useState('');
  const [editReplacementCost, setEditReplacementCost] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Populate edit form when asset changes
  useEffect(() => {
    if (asset) {
      setEditName(asset.name);
      setEditCategory(asset.category);
      setEditLocation(asset.location);
      setEditManufacturer(asset.manufacturer ?? '');
      setEditModelNumber(asset.modelNumber ?? '');
      setEditSerialNumber(asset.serialNumber ?? '');
      setEditPurchaseDate(asset.purchaseDate ?? '');
      setEditPurchasePrice(asset.purchasePrice != null ? String(asset.purchasePrice / 100) : '');
      setEditWarrantyExpiration(asset.warrantyExpiration ?? '');
      setEditReplacementCost(
        asset.replacementCost != null ? String(asset.replacementCost / 100) : ''
      );
      setEditNotes(asset.notes ?? '');
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [asset?.id]);

  // Fetch sensor readings when asset has sensorIds
  useEffect(() => {
    if (!asset || asset.sensorIds.length === 0) {
      setSensorReadings([]);
      return;
    }

    setSensorsLoading(true);
    apiGet<SensorReadingsResponse>('/api/sensors')
      .then((result) => {
        if (result.success && result.data) {
          const linked = result.data
            .filter((s) => asset.sensorIds.includes(s.id))
            .map((s) => ({
              sensorId: s.id,
              type: s.type,
              value: s.lastReading?.value ?? 0,
              unit: s.lastReading?.unit ?? '',
              timestamp: s.lastReading?.timestamp ?? '',
              online: s.online,
            }));
          setSensorReadings(linked);
        } else {
          setSensorReadings([]);
        }
      })
      .catch(() => setSensorReadings([]))
      .finally(() => setSensorsLoading(false));
  }, [asset?.id, asset?.sensorIds.join(',')]);

  const handleSave = async () => {
    if (!asset) return;

    const updates: UpdateAssetInput = {
      name: editName,
      category: editCategory,
      location: editLocation,
      manufacturer: editManufacturer || null,
      modelNumber: editModelNumber || null,
      serialNumber: editSerialNumber || null,
      purchaseDate: editPurchaseDate || null,
      purchasePrice: editPurchasePrice ? Math.round(parseFloat(editPurchasePrice) * 100) : null,
      warrantyExpiration: editWarrantyExpiration || null,
      replacementCost: editReplacementCost
        ? Math.round(parseFloat(editReplacementCost) * 100)
        : null,
      notes: editNotes || null,
    };

    const result = await onUpdate(asset.id, updates);
    if (result) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!asset) return;
    const success = await onDelete(asset.id);
    if (success) {
      onClose();
    }
  };

  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-base">{asset.name}</SheetTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsEditing(!isEditing)}
                aria-label="Edit asset"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete asset"
                className="hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {isEditing ? (
            // ── Edit form ────────────────────────────────────────────────────
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editCategory}
                  onValueChange={(v) => setEditCategory(v as AssetCategory)}
                >
                  <SelectTrigger id="edit-category">
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
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Kitchen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                  <Input
                    id="edit-manufacturer"
                    value={editManufacturer}
                    onChange={(e) => setEditManufacturer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-model">Model Number</Label>
                  <Input
                    id="edit-model"
                    value={editModelNumber}
                    onChange={(e) => setEditModelNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-serial">Serial Number</Label>
                <Input
                  id="edit-serial"
                  value={editSerialNumber}
                  onChange={(e) => setEditSerialNumber(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-purchase-date">Purchase Date</Label>
                  <Input
                    id="edit-purchase-date"
                    type="date"
                    value={editPurchaseDate}
                    onChange={(e) => setEditPurchaseDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-purchase-price">Purchase Price ($)</Label>
                  <Input
                    id="edit-purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-warranty">Warranty Expiration</Label>
                  <Input
                    id="edit-warranty"
                    type="date"
                    value={editWarrantyExpiration}
                    onChange={(e) => setEditWarrantyExpiration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-replacement-cost">Replacement Cost ($)</Label>
                  <Input
                    id="edit-replacement-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editReplacementCost}
                    onChange={(e) => setEditReplacementCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
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
            // ── Read-only view ──────────────────────────────────────────────
            <div className="space-y-4">
              <DetailRow label="Category">
                <Badge variant="secondary">{asset.category}</Badge>
              </DetailRow>
              <DetailRow label="Location">{asset.location || '—'}</DetailRow>
              {asset.manufacturer && (
                <DetailRow label="Manufacturer">{asset.manufacturer}</DetailRow>
              )}
              {asset.modelNumber && <DetailRow label="Model Number">{asset.modelNumber}</DetailRow>}
              {asset.serialNumber && (
                <DetailRow label="Serial Number">{asset.serialNumber}</DetailRow>
              )}
              {asset.purchaseDate && (
                <DetailRow label="Purchase Date">
                  {new Date(asset.purchaseDate + 'T00:00:00').toLocaleDateString()}
                </DetailRow>
              )}
              {asset.purchasePrice != null && (
                <DetailRow label="Purchase Price">
                  ${(asset.purchasePrice / 100).toFixed(2)}
                </DetailRow>
              )}
              {asset.warrantyExpiration && (
                <DetailRow label="Warranty Expires">
                  {new Date(asset.warrantyExpiration + 'T00:00:00').toLocaleDateString()}
                </DetailRow>
              )}
              {asset.replacementCost != null && (
                <DetailRow label="Replacement Cost">
                  ${(asset.replacementCost / 100).toFixed(2)}
                </DetailRow>
              )}
              {asset.manualUrl && (
                <DetailRow label="Manual">
                  <a
                    href={asset.manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Manual
                  </a>
                </DetailRow>
              )}
              {asset.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-sm text-foreground-secondary whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Linked sensor readings ──────────────────────────────────── */}
          {asset.sensorIds.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Linked Sensors
              </p>
              {sensorsLoading ? (
                <p className="text-sm text-muted-foreground">Loading sensor data...</p>
              ) : sensorReadings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked sensors</p>
              ) : (
                <div className="space-y-2">
                  {sensorReadings.map((sensor) => (
                    <div
                      key={sensor.sensorId}
                      className="flex items-center justify-between rounded-md border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {sensor.online ? (
                          <Wifi className="size-4 text-emerald-500" />
                        ) : (
                          <WifiOff className="size-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{sensor.type}</p>
                          <p className="text-xs text-muted-foreground">ID: {sensor.sensorId}</p>
                        </div>
                      </div>
                      {sensor.timestamp && (
                        <div className="text-right">
                          <p className="text-sm text-foreground">
                            {sensor.value} {sensor.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sensor.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Delete confirmation ─────────────────────────────────────── */}
          {confirmDelete && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-foreground">
                Delete <strong>{asset.name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} loading={isMutating}>
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-muted-foreground shrink-0 w-32">{label}</p>
      <div className="text-sm text-foreground text-right">{children}</div>
    </div>
  );
}
