/**
 * Category Breakdown
 *
 * CSS-only horizontal bar chart showing spending per category.
 * Bar widths scale proportionally to each category's total expense.
 */

import { SkeletonPulse } from '@protolabsai/ui/atoms';
import type { BudgetCategorySummary } from '@protolabsai/types';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

interface CategoryBreakdownProps {
  byCategory: BudgetCategorySummary[];
  loading?: boolean;
}

export function CategoryBreakdown({ byCategory, loading }: CategoryBreakdownProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <SkeletonPulse className="h-3 w-24" />
              <SkeletonPulse className="h-3 w-16" />
            </div>
            <SkeletonPulse className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const expenseCategories = byCategory.filter((c) => c.total > 0);

  if (expenseCategories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No spending recorded this month.
      </p>
    );
  }

  const maxTotal = Math.max(...expenseCategories.map((c) => c.total));

  return (
    <div className="space-y-3">
      {expenseCategories.map((cat) => {
        const percentage = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
        return (
          <div key={cat.categoryId}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm text-foreground truncate">{cat.categoryName}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {formatCents(cat.total)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
