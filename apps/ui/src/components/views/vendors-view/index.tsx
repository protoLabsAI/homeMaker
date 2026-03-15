/**
 * Vendors View
 *
 * Main view for browsing and managing home service vendors (plumbers,
 * electricians, HVAC techs, etc.). Shows a searchable, filterable grid
 * of vendor cards with a slide-out detail panel.
 */

import { useState, useMemo, useCallback } from 'react';
import { Users, Plus, Search, X } from 'lucide-react';
import { Button, Input } from '@protolabsai/ui/atoms';
import { ErrorState } from '@protolabsai/ui/molecules';
import { PanelHeader } from '@/components/shared/panel-header';
import { toast } from 'sonner';
import { useVendors } from '@/hooks/use-vendors';
import { VendorList } from './vendor-list';
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
  const { vendors, isLoading, isMutating, error, createVendor, refetch } = useVendors();

  const [search, setSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<VendorCategory>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Filter vendors by search + active categories
  const filteredVendors = useMemo(() => {
    let result = vendors;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.company ?? '').toLowerCase().includes(q) ||
          (v.notes ?? '').toLowerCase().includes(q)
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

  const handleVendorDeleted = useCallback(() => {
    setSelectedVendor(null);
    void refetch();
    toast.success('Vendor deleted');
  }, [refetch]);

  const hasActiveFilters = activeCategories.size > 0 || search.trim();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <PanelHeader
        icon={Users}
        title="Vendors"
        actions={[
          {
            icon: Plus,
            label: 'Add Vendor',
            onClick: () => setAddDialogOpen(true),
          },
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + category filter bar */}
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, company, notes..."
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
            {error ? (
              <ErrorState error={error} />
            ) : (
              <VendorList
                vendors={filteredVendors}
                isLoading={isLoading}
                hasActiveFilters={!!hasActiveFilters}
                onVendorClick={handleVendorClick}
                onAddVendor={() => setAddDialogOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Vendor detail panel */}
      <VendorDetailPanel
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onDeleted={handleVendorDeleted}
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
