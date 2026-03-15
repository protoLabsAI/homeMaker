/**
 * Asset Card
 *
 * Displays a single household asset with name, category badge, location,
 * purchase date, manufacturer, and warranty status indicator.
 */

import { Badge, Button } from '@protolabsai/ui/atoms';
import { MapPin, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@protolabsai/types';

// ============================================================================
// Warranty helpers
// ============================================================================

type WarrantyStatus = 'active' | 'expiring' | 'expired' | 'none';

function getWarrantyStatus(warrantyExpiration: string | null): WarrantyStatus {
  if (!warrantyExpiration) return 'none';
  const expiry = new Date(warrantyExpiration + 'T00:00:00');
  if (isNaN(expiry.getTime())) return 'none';

  const now = new Date();
  if (expiry < now) return 'expired';

  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 90) return 'expiring';

  return 'active';
}

function formatWarrantyLabel(warrantyExpiration: string | null, status: WarrantyStatus): string {
  if (status === 'none' || !warrantyExpiration) return '';
  if (status === 'expired') return 'Expired';

  const expiry = new Date(warrantyExpiration + 'T00:00:00');
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === 'expiring') {
    return `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
  }

  return `Until ${expiry.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

const WARRANTY_DOT_STYLES: Record<WarrantyStatus, string> = {
  active: 'bg-emerald-500',
  expiring: 'bg-amber-500',
  expired: 'bg-destructive',
  none: '',
};

const WARRANTY_TEXT_STYLES: Record<WarrantyStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  expiring: 'text-amber-600 dark:text-amber-400',
  expired: 'text-destructive',
  none: '',
};

// ============================================================================
// Category badge
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  appliance: 'Appliance',
  furniture: 'Furniture',
  electronics: 'Electronics',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  structural: 'Structural',
  outdoor: 'Outdoor',
  vehicle: 'Vehicle',
  other: 'Other',
};

// ============================================================================
// Component
// ============================================================================

interface AssetCardProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
  selected?: boolean;
}

export function AssetCard({ asset, onClick, selected = false }: AssetCardProps) {
  const warrantyStatus = getWarrantyStatus(asset.warrantyExpiration);
  const warrantyLabel = formatWarrantyLabel(asset.warrantyExpiration, warrantyStatus);

  return (
    <Button
      variant="ghost"
      onClick={() => onClick(asset)}
      className={cn(
        'w-full h-auto text-left rounded-lg border border-border bg-card p-4 transition-colors',
        'hover:border-primary/50 hover:bg-accent/50',
        selected && 'border-primary bg-accent/50'
      )}
      aria-label={`View details for ${asset.name}`}
    >
      <div className="space-y-3">
        {/* Header: name + category badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {asset.name}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {CATEGORY_LABELS[asset.category] ?? asset.category}
          </Badge>
        </div>

        {/* Location */}
        {asset.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{asset.location}</span>
          </div>
        )}

        {/* Manufacturer */}
        {asset.manufacturer && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3 shrink-0" />
            <span className="truncate">{asset.manufacturer}</span>
          </div>
        )}

        {/* Purchase date */}
        {asset.purchaseDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>
              {new Date(asset.purchaseDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Warranty indicator */}
        {warrantyStatus !== 'none' && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn('size-2 rounded-full shrink-0', WARRANTY_DOT_STYLES[warrantyStatus])}
              aria-hidden="true"
            />
            <span className={cn('text-xs', WARRANTY_TEXT_STYLES[warrantyStatus])}>
              {warrantyLabel}
            </span>
          </div>
        )}
      </div>
    </Button>
  );
}
