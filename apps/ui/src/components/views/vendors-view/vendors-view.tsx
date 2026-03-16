/**
 * Vendors View
 *
 * Main view for browsing, searching, and managing service providers.
 * Top bar has search + category filter chips + Add Vendor button.
 * Below is a responsive vendor grid with a slide-out detail panel.
 */

import { useState, useMemo, useCallback } from 'react';
import { Store, Plus, Search, X } from 'lucide-react';
import { Button, Input } from '@protolabsai/ui/atoms';
import { SkeletonPulse } from '@protolabsai/ui/atoms';
import { ErrorState } from '@protolabsai/ui/molecules';
import { PanelHeader } from '@/components/shared/panel-header';
import { toast } from 'sonner';
import { useVendors } from './hooks/use-vendors';
import { VendorCard } from './vendor-card';
import { VendorDetailPanel } from './vendor-detail-panel';
import { AddVendorDialog } from './add-vendor-dialog';
import type { Vendor, VendorCategory } from '@protolabsai/types';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_FILTER_OPTIONS: { value: VendorCategory; label: string }[] = [
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
// Filter chip sub-component
// ============================================================================

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="rounded-full h-6 px-2.5 py-0.5 text-xs font-medium"
    >
      {label}
    </Button>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function VendorsView() {
  const { vendors, isLoading, isMutating, error, createVendor, updateVendor, deleteVendor } =
    useVendors();

  const [search, setSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<VendorCategory>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Filter vendors based on search + active category filters
  const filteredVendors = useMemo(() => {
    let result = vendors;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.company ?? '').toLowerCase().includes(q) ||
          v.phone.toLowerCase().includes(q) ||
          (v.email ?? '').toLowerCase().includes(q)
      );
    }

    if (activeCategories.size > 0) {
      result = result.filter((v) => activeCategories.has(v.category));
    }

    return result;
  }, [vendors, search, activeCategories]);

  const toggleCategory = useCallback((category: VendorCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleVendorClick = useCallback((vendor: Vendor) => {
    setSelectedVendor(vendor);
  }, []);

  const handleCreateVendor = useCallback(
    async (input: Parameters<typeof createVendor>[0]) => {
      try {
        const result = await createVendor(input);
        if (result) {
          toast.success(`Added ${result.name}`);
        }
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add vendor');
        return null;
      }
    },
    [createVendor]
  );

  const handleUpdateVendor = useCallback(
    async (id: string, updates: Parameters<typeof updateVendor>[1]) => {
      try {
        const result = await updateVendor(id, updates);
        if (result) {
          setSelectedVendor(result);
          toast.success('Vendor updated');
        }
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update vendor');
        return null;
      }
    },
    [updateVendor]
  );

  const handleDeleteVendor = useCallback(
    async (id: string) => {
      try {
        const success = await deleteVendor(id);
        if (success) {
          toast.success('Vendor deleted');
          setSelectedVendor(null);
        }
        return success;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete vendor');
        return false;
      }
    },
    [deleteVendor]
  );

  const hasActiveFilters = activeCategories.size > 0 || search.trim();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <PanelHeader
        icon={Store}
        title="Vendors"
        actions={[
          {
            icon: Plus,
            label: 'Add Vendor',
            onClick: () => setAddDialogOpen(true),
          },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search + filters bar */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, phone, email..."
              className="pl-8 pr-8"
              aria-label="Search vendors"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_FILTER_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={activeCategories.has(opt.value)}
                onClick={() => toggleCategory(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Vendor grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonPulse key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <ErrorState error={error} />
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Store className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {hasActiveFilters ? 'No vendors match your filters' : 'No vendors yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Add your first service provider to get started'}
              </p>
              {!hasActiveFilters && (
                <Button size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="size-4" />
                  Add Vendor
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onClick={handleVendorClick}
                  selected={selectedVendor?.id === vendor.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vendor detail panel */}
      <VendorDetailPanel
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onUpdate={handleUpdateVendor}
        onDeleted={handleDeleteVendor}
        isMutating={isMutating}
      />

      {/* Add vendor dialog */}
      <AddVendorDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onCreate={handleCreateVendor}
        isMutating={isMutating}
      />
    </div>
  );
}
