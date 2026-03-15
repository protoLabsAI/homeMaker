import { useState, useMemo } from 'react';
import { Wrench, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PanelHeader } from '@/components/shared/panel-header';
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SkeletonPulse,
} from '@protolabsai/ui/atoms';
import type { Vendor, CreateVendorInput, VendorCategory } from '@protolabsai/types';
import { useVendors, useCreateVendor } from './hooks/use-vendors';
import { VendorCard } from './vendor-card';
import { AddVendorDialog } from './add-vendor-dialog';
import { VendorDetailPanel } from './vendor-detail-panel';

type CategoryTab = 'all' | VendorCategory;

const CATEGORY_TABS: { value: CategoryTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'general-contractor', label: 'General Contractor' },
  { value: 'other', label: 'Other' },
];

export function VendorsView() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Vendor | null>(null);

  const { data: vendors = [], isLoading, error } = useVendors();
  const createVendor = useCreateVendor();

  const filtered = useMemo(() => {
    let result = vendors;

    // Filter by category tab
    if (activeTab !== 'all') {
      result = result.filter((v) => v.category === activeTab);
    }

    // Filter by search query across name, company, notes
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.company?.toLowerCase().includes(q) ?? false) ||
          v.notes.toLowerCase().includes(q)
      );
    }

    return result;
  }, [vendors, activeTab, searchQuery]);

  const handleCreate = (input: CreateVendorInput) => {
    createVendor.mutate(input, {
      onSuccess: () => {
        setShowAddDialog(false);
        toast.success('Vendor added');
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to add vendor');
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        icon={Wrench}
        title="Vendors"
        extra={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search by name, company, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category filter tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryTab)}>
          <TabsList className="w-full sm:w-auto flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {/* Loading state */}
            {isLoading && (
              <div className="space-y-3">
                <SkeletonPulse className="h-36 w-full rounded-lg" />
                <SkeletonPulse className="h-36 w-full rounded-lg" />
                <SkeletonPulse className="h-36 w-full rounded-lg" />
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="text-sm text-destructive py-8 text-center">
                Failed to load vendors.
              </div>
            )}

            {/* Empty state (no vendors at all) */}
            {!isLoading && !error && vendors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Wrench className="h-10 w-10 opacity-30" />
                <p className="text-sm">No vendors yet.</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add your first vendor
                </Button>
              </div>
            )}

            {/* Filtered empty state */}
            {!isLoading && !error && vendors.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <p className="text-sm">No vendors match this filter.</p>
              </div>
            )}

            {/* Vendor grid */}
            {!isLoading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} onClick={(v) => setDetailTarget(v)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add vendor dialog */}
      <AddVendorDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleCreate}
        isSubmitting={createVendor.isPending}
      />

      {/* Vendor detail panel */}
      <VendorDetailPanel
        vendor={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDeleted={() => setDetailTarget(null)}
      />
    </div>
  );
}
