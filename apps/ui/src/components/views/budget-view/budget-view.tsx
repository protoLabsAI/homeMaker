/**
 * Budget View
 *
 * Main household budget view with month navigation, summary cards,
 * category breakdown, and transaction list.
 */

import { useState, useCallback } from 'react';
import { DollarSign, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PanelHeader } from '@/components/shared/panel-header';
import { Card, CardHeader, CardTitle, CardContent } from '@protolabsai/ui/atoms';
import { SummaryCards } from './summary-cards';
import { CategoryBreakdown } from './category-breakdown';
import { TransactionList } from './transaction-list';
import { AddTransactionDialog } from './add-transaction-dialog';
import { useBudget, toMonthParam } from './hooks/use-budget';

function formatMonthLabel(monthParam: string): string {
  const [y, m] = monthParam.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function prevMonth(monthParam: string): string {
  const [y, m] = monthParam.split('-').map(Number);
  const d = new Date(y, m - 2); // m-1 is current month (0-indexed), m-2 goes back one
  return toMonthParam(d);
}

function nextMonth(monthParam: string): string {
  const [y, m] = monthParam.split('-').map(Number);
  const d = new Date(y, m); // m is already 0-indexed next month
  return toMonthParam(d);
}

export function BudgetView() {
  const [month, setMonth] = useState(() => toMonthParam(new Date()));
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    transactions,
    categories,
    summary,
    isLoading,
    isMutating,
    error,
    createTransaction,
    deleteTransaction,
  } = useBudget(month);

  const handlePrevMonth = useCallback(() => setMonth((m) => prevMonth(m)), []);
  const handleNextMonth = useCallback(() => setMonth((m) => nextMonth(m)), []);

  const handleCreateTransaction = useCallback(
    async (input: Parameters<typeof createTransaction>[0]) => {
      try {
        await createTransaction(input);
        setShowAddDialog(false);
        toast.success('Transaction added');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add transaction');
        throw err;
      }
    },
    [createTransaction]
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id);
        toast.success('Transaction deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete transaction');
      }
    },
    [deleteTransaction]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader
        icon={DollarSign}
        title="Budget"
        actions={[
          {
            icon: Plus,
            label: 'Add transaction',
            onClick: () => setShowAddDialog(true),
            testId: 'add-transaction-button',
          },
          { icon: ChevronLeft, label: 'Previous month', onClick: handlePrevMonth },
          { icon: ChevronRight, label: 'Next month', onClick: handleNextMonth },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-6">
          {/* Month label */}
          <h2 className="text-base font-semibold">{formatMonthLabel(month)}</h2>

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Summary cards */}
          <SummaryCards summary={summary} loading={isLoading} />

          {/* Two-column layout: category breakdown + transaction list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category breakdown */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBreakdown byCategory={summary?.byCategory ?? []} loading={isLoading} />
              </CardContent>
            </Card>

            {/* Transaction list */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  loading={isLoading}
                  isMutating={isMutating}
                  onDelete={handleDeleteTransaction}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddTransactionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categories={categories}
        defaultMonth={month}
        isMutating={isMutating}
        onSubmit={handleCreateTransaction}
      />
    </div>
  );
}
