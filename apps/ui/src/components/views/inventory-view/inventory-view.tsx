/**
 * Inventory View
 *
 * Main view for browsing, searching, and managing household assets.
 * Top bar has search + category/location filter chips + Add Asset button.
 * Below is a responsive asset grid. Right sidebar has the warranty report.
 */

import { useState, useMemo, useCallback } from 'react';
import { Package, Plus, Search, X } from 'lucide-react';
import { Button, Input } from '@protolabsai/ui/atoms';
import { SkeletonPulse } from '@protolabsai/ui/atoms';
import { ErrorState, LoadingState } from '@protolabsai/ui/molecules';
import { PanelHeader } from '@/components/shared/panel-header';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useInventory } from './hooks/use-inventory';
import { AssetCard } from './asset-card';
import { AssetDetailPanel } from './asset-detail-panel';
import { AddAssetDialog } from './add-asset-dialog';
import { WarrantyReport } from './warranty-report';
import type { Asset, AssetCategory } from '@protolabsai/types';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_FILTER_OPTIONS: { value: AssetCategory; label: string }[] = [
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

// ============================================================================
// Filter chip sub-component
// ============================================================================

interface FilterChipProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, disabled = false, onClick }: FilterChipProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full h-6 px-2.5 py-0.5 text-xs font-medium"
    >
      {label}
    </Button>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function InventoryView() {
  const {
    assets,
    isLoading,
    isMutating,
    error,
    warrantyReport,
    createAsset,
    updateAsset,
    deleteAsset,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<AssetCategory>>(new Set());
  const [activeLocations, setActiveLocations] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Derive unique locations from loaded assets
  const locationOptions = useMemo(() => {
    const locations = new Set(assets.map((a) => a.location).filter(Boolean));
    return Array.from(locations).sort();
  }, [assets]);

  // Filter assets based on search + active filters
  const filteredAssets = useMemo(() => {
    let result = assets;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.manufacturer ?? '').toLowerCase().includes(q) ||
          (a.modelNumber ?? '').toLowerCase().includes(q)
      );
    }

    if (activeCategories.size > 0) {
      result = result.filter((a) => activeCategories.has(a.category));
    }

    if (activeLocations.size > 0) {
      result = result.filter((a) => activeLocations.has(a.location));
    }

    return result;
  }, [assets, search, activeCategories, activeLocations]);

  const toggleCategory = useCallback((category: AssetCategory) => {
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

  const toggleLocation = useCallback((location: string) => {
    setActiveLocations((prev) => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
  }, []);

  const handleAssetClick = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  }, []);

  const handleCreateAsset = useCallback(
    async (input: Parameters<typeof createAsset>[0]) => {
      try {
        const result = await createAsset(input);
        if (result) {
          toast.success(`Added ${result.name}`);
        }
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add asset');
        return null;
      }
    },
    [createAsset]
  );

  const handleUpdateAsset = useCallback(
    async (id: string, updates: Parameters<typeof updateAsset>[1]) => {
      try {
        const result = await updateAsset(id, updates);
        if (result) {
          setSelectedAsset(result);
          toast.success('Asset updated');
        }
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update asset');
        return null;
      }
    },
    [updateAsset]
  );

  const handleDeleteAsset = useCallback(
    async (id: string) => {
      try {
        const success = await deleteAsset(id);
        if (success) {
          toast.success('Asset deleted');
          setDetailOpen(false);
          setSelectedAsset(null);
        }
        return success;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete asset');
        return false;
      }
    },
    [deleteAsset]
  );

  const hasActiveFilters = activeCategories.size > 0 || activeLocations.size > 0 || search.trim();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <PanelHeader
        icon={Package}
        title="Inventory"
        actions={[
          {
            icon: Plus,
            label: 'Add Asset',
            onClick: () => setAddDialogOpen(true),
          },
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
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
                placeholder="Search by name, manufacturer, model..."
                className="pl-8 pr-8"
                aria-label="Search assets"
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

            {/* Location filter chips */}
            {locationOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {locationOptions.map((loc) => (
                  <FilterChip
                    key={loc}
                    label={loc}
                    active={activeLocations.has(loc)}
                    onClick={() => toggleLocation(loc)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Asset grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonPulse key={i} className="h-36 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <ErrorState message={error} />
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {hasActiveFilters ? 'No assets match your filters' : 'No assets yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters
                    ? 'Try adjusting your search or filters'
                    : 'Add your first household asset to get started'}
                </p>
                {!hasActiveFilters && (
                  <Button size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="size-4" />
                    Add Asset
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onClick={handleAssetClick}
                    selected={selectedAsset?.id === asset.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — warranty report */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 border-l border-border overflow-y-auto p-4">
          <WarrantyReport assets={assets} warrantyReport={warrantyReport} />
        </div>
      </div>

      {/* Asset detail panel */}
      <AssetDetailPanel
        asset={selectedAsset}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedAsset(null);
        }}
        onUpdate={handleUpdateAsset}
        onDelete={handleDeleteAsset}
        isMutating={isMutating}
      />

      {/* Add asset dialog */}
      <AddAssetDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onCreate={handleCreateAsset}
        isMutating={isMutating}
      />
    </div>
  );
}
