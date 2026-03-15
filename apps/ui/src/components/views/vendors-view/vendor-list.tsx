/**
 * Vendor List
 *
 * Renders a responsive grid of VendorCard components.
 * Handles empty and loading states.
 */

import { Users, Plus } from 'lucide-react';
import { Button } from '@protolabsai/ui/atoms';
import { SkeletonPulse } from '@protolabsai/ui/atoms';
import { VendorCard } from './vendor-card';
import type { Vendor } from '@protolabsai/types';

// ============================================================================
// Component
// ============================================================================

interface VendorListProps {
  vendors: Vendor[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onVendorClick: (vendor: Vendor) => void;
  onAddVendor: () => void;
}

export function VendorList({
  vendors,
  isLoading,
  hasActiveFilters,
  onVendorClick,
  onAddVendor,
}: VendorListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="size-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">
          {hasActiveFilters ? 'No vendors match your filters' : 'No vendors yet'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {hasActiveFilters
            ? 'Try adjusting your search or filters'
            : 'Add your first service provider to get started'}
        </p>
        {!hasActiveFilters && (
          <Button size="sm" className="mt-4" onClick={onAddVendor}>
            <Plus className="size-4" />
            Add Vendor
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors.map((vendor) => (
        <VendorCard key={vendor.id} vendor={vendor} onClick={onVendorClick} />
      ))}
    </div>
  );
}
