/**
 * Vendor Card
 *
 * Displays a single vendor with name, company, category badge, phone,
 * star rating, and last service date.
 */

import { Badge, Button } from '@protolabsai/ui/atoms';
import { Phone, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vendor, VendorCategory } from '@protolabsai/types';

// ============================================================================
// Constants
// ============================================================================

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

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  return (
    <Button
      variant="ghost"
      onClick={() => onClick(vendor)}
      className={cn(
        'w-full h-auto text-left rounded-lg border border-border bg-card p-4 transition-colors',
        'hover:border-primary/50 hover:bg-accent/50'
      )}
      aria-label={`View details for ${vendor.name}`}
    >
      <div className="space-y-3">
        {/* Header: name + category badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground line-clamp-1 leading-tight">
              {vendor.name}
            </h3>
            {vendor.company && (
              <p className="text-xs text-muted-foreground truncate">{vendor.company}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {CATEGORY_LABELS[vendor.category] ?? vendor.category}
          </Badge>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="size-3 shrink-0" />
          <span className="truncate">{vendor.phone}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-0.5">
          {vendor.rating !== null ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'size-3',
                  i < (vendor.rating ?? 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                )}
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">Unrated</span>
          )}
        </div>

        {/* Last service date */}
        {vendor.lastServiceDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>
              {new Date(vendor.lastServiceDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </Button>
  );
}
