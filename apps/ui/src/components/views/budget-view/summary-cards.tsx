/**
 * Budget Summary Cards
 *
 * Displays Total Income, Total Expenses, and Balance for the selected month.
 * All amounts are in cents and formatted as USD currency.
 */

import { Card, CardContent } from '@protolabsai/ui/atoms';
import { SkeletonPulse } from '@protolabsai/ui/atoms';
import { cn } from '@/lib/utils';
import type { BudgetSummary } from '@protolabsai/types';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

interface SummaryCardProps {
  label: string;
  amount: number;
  colorClass: string;
  loading?: boolean;
}

function SummaryCard({ label, amount, colorClass, loading }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {loading ? (
          <SkeletonPulse className="h-7 w-28" />
        ) : (
          <p className={cn('text-xl font-semibold tabular-nums', colorClass)}>
            {formatCents(amount)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SummaryCardsProps {
  summary: BudgetSummary | null;
  loading?: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const balance = summary?.balance ?? 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <SummaryCard
        label="Total Income"
        amount={totalIncome}
        colorClass="text-status-success"
        loading={loading}
      />
      <SummaryCard
        label="Total Expenses"
        amount={totalExpenses}
        colorClass="text-status-error"
        loading={loading}
      />
      <SummaryCard
        label="Balance"
        amount={balance}
        colorClass={balance >= 0 ? 'text-status-success' : 'text-status-error'}
        loading={loading}
      />
    </div>
  );
}
