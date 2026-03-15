/**
 * Vault View
 *
 * Main secrets vault view with search bar and entry list.
 * Search filters client-side first, then falls back to server search
 * for deeper matches when the local filter yields no results.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { KeyRound, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PanelHeader } from '@/components/shared/panel-header';
import { Input, SkeletonPulse } from '@protolabsai/ui/atoms';
import { VaultEntryCard } from './vault-entry-card';
import { AddEntryDialog } from './add-entry-dialog';
import { useVault, type CreateVaultEntryInput } from './hooks/use-vault';
import type { VaultEntry } from '@protolabsai/types';

/** Minimum query length before triggering server-side search */
const SERVER_SEARCH_MIN_LENGTH = 2;

/** Debounce delay for server-side search in milliseconds */
const SEARCH_DEBOUNCE_MS = 400;

function filterEntriesLocally(entries: VaultEntry[], query: string): VaultEntry[] {
  const lower = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      e.category.toLowerCase().includes(lower) ||
      e.tags.some((t) => t.toLowerCase().includes(lower)) ||
      e.username?.toLowerCase().includes(lower) ||
      e.url?.toLowerCase().includes(lower)
  );
}

export function VaultView() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverResults, setServerResults] = useState<VaultEntry[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    entries,
    isLoading,
    isMutating,
    error,
    createEntry,
    deleteEntry,
    fetchDecryptedValue,
    searchEntries,
  } = useVault();

  const handleCreateEntry = useCallback(
    async (input: CreateVaultEntryInput) => {
      try {
        await createEntry(input);
        setShowAddDialog(false);
        toast.success('Vault entry created');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create entry');
        throw err;
      }
    },
    [createEntry]
  );

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      try {
        await deleteEntry(id);
        toast.success('Vault entry deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete entry');
      }
    },
    [deleteEntry]
  );

  // Client-side filtered entries
  const localFiltered = useMemo(
    () => (searchQuery ? filterEntriesLocally(entries, searchQuery) : entries),
    [entries, searchQuery]
  );

  // Trigger server search when local yields no results
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setServerResults(null);

      // Clear pending server search
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }

      if (!value.trim() || value.trim().length < SERVER_SEARCH_MIN_LENGTH) {
        setIsSearching(false);
        return;
      }

      // Debounced server-side fallback: only triggers when local filtering
      // is complete and might miss results (server can search by encrypted fields, notes, etc.)
      searchTimerRef.current = setTimeout(async () => {
        const localResults = filterEntriesLocally(entries, value);
        if (localResults.length === 0) {
          setIsSearching(true);
          try {
            const results = await searchEntries(value.trim());
            setServerResults(results);
          } catch {
            // Server search failure is non-critical; local results still show
          } finally {
            setIsSearching(false);
          }
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [entries, searchEntries]
  );

  // Use server results when local filtering yields nothing and server has responded
  const displayedEntries =
    searchQuery && localFiltered.length === 0 && serverResults ? serverResults : localFiltered;

  const isEmpty = !isLoading && displayedEntries.length === 0;
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader
        icon={KeyRound}
        title="Vault"
        actions={[
          {
            icon: Plus,
            label: 'Add entry',
            onClick: () => setShowAddDialog(true),
            testId: 'add-vault-entry-button',
          },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search vault entries..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleSearchChange(e.target.value)
              }
              className="pl-9"
            />
          </div>

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonPulse key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Searching indicator */}
          {isSearching && !isLoading && (
            <p className="text-xs text-muted-foreground text-center py-2">Searching server...</p>
          )}

          {/* Empty state */}
          {isEmpty && !isSearching && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <KeyRound className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {hasSearchQuery
                  ? 'No entries match your search.'
                  : 'No vault entries yet. Add one to get started.'}
              </p>
            </div>
          )}

          {/* Entry list */}
          {!isLoading && displayedEntries.length > 0 && (
            <div className="space-y-3">
              {displayedEntries.map((entry) => (
                <VaultEntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDeleteEntry}
                  onFetchDecryptedValue={fetchDecryptedValue}
                  isMutating={isMutating}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        isMutating={isMutating}
        onSubmit={handleCreateEntry}
      />
    </div>
  );
}
