/**
 * Warranty Report
 *
 * Summary cards showing total assets, active warranties, expiring soon
 * (within 90 days), expired count, and total replacement value.
 */

import { type ReactNode } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarrantyReport as WarrantyReportType, Asset } from '@protolabsai/types';

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(cents: number): string {
  if (cents === 0) return '$0';
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function calculateTotalReplacementValue(assets: Asset[]): number {
  return assets.reduce((sum, asset) => sum + (asset.replacementCost ?? 0), 0);
}

// ============================================================================
// Component
// ============================================================================

interface WarrantyReportProps {
  assets: Asset[];
  warrantyReport: WarrantyReportType | null;
}

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

function SummaryCard({ icon, label, value, className }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card p-3',
        className
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function WarrantyReport({ assets, warrantyReport }: WarrantyReportProps) {
  const totalAssets = assets.length;
  const activeCount = warrantyReport?.active.length ?? 0;
  const expiringSoonCount = warrantyReport?.expiringSoon.length ?? 0;
  const expiredCount = warrantyReport?.expired.length ?? 0;
  const totalReplacementValue = calculateTotalReplacementValue(assets);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Warranty Report
      </p>

      <div className="space-y-2">
        <SummaryCard
          icon={<ShieldCheck className="size-4 text-muted-foreground" />}
          label="Total Assets"
          value={totalAssets}
        />

        <SummaryCard
          icon={<ShieldCheck className="size-4 text-emerald-500" />}
          label="Active Warranties"
          value={activeCount}
        />

        <SummaryCard
          icon={<ShieldAlert className="size-4 text-amber-500" />}
          label="Expiring Soon"
          value={expiringSoonCount}
        />

        {expiredCount > 0 && (
          <SummaryCard
            icon={<ShieldX className="size-4 text-destructive" />}
            label="Expired"
            value={expiredCount}
          />
        )}

        <SummaryCard
          icon={<DollarSign className="size-4 text-primary" />}
          label="Replacement Value"
          value={totalReplacementValue > 0 ? formatCurrency(totalReplacementValue) : 'N/A'}
        />
      </div>

      {warrantyReport && warrantyReport.expiringSoon.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Expiring Soon</p>
          <div className="space-y-1">
            {warrantyReport.expiringSoon.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground-secondary truncate max-w-[120px]">
                  {asset.name}
                </span>
                {asset.warrantyExpiration && (
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(asset.warrantyExpiration + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
