/**
 * Transaction List
 *
 * Paginated list of transactions with type badge, amount, category, date, and description.
 */

import { useState } from 'react';
import { Badge, Button, SkeletonPulse } from '@protolabsai/ui/atoms';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction, BudgetCategory } from '@protolabsai/types';

const PAGE_SIZE = 10;

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface TransactionRowProps {
  transaction: Transaction;
  category: BudgetCategory | undefined;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function TransactionRow({ transaction, category, onDelete, isDeleting }: TransactionRowProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Badge variant={isIncome ? 'success' : 'error'} className="shrink-0 capitalize">
        {transaction.type}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">
          {category?.name ?? 'Uncategorized'} &middot; {formatDate(transaction.date)}
          {transaction.recurrence && (
            <span className="ml-1 capitalize">· {transaction.recurrence}</span>
          )}
        </p>
      </div>
      <span
        className={cn(
          'text-sm font-medium tabular-nums shrink-0',
          isIncome ? 'text-status-success' : 'text-status-error'
        )}
      >
        {isIncome ? '+' : '-'}
        {formatCents(transaction.amount)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete transaction"
        onClick={() => onDelete(transaction.id)}
        disabled={isDeleting}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  loading?: boolean;
  isMutating: boolean;
  onDelete: (id: string) => void;
}

export function TransactionList({
  transactions,
  categories,
  loading,
  isMutating,
  onDelete,
}: TransactionListProps) {
  const [page, setPage] = useState(1);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <SkeletonPulse className="h-5 w-16 rounded-full" />
            <div className="flex-1 space-y-1">
              <SkeletonPulse className="h-4 w-3/4" />
              <SkeletonPulse className="h-3 w-1/2" />
            </div>
            <SkeletonPulse className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No transactions recorded this month.
      </p>
    );
  }

  return (
    <div>
      <div>
        {pageItems.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            category={categoryMap.get(tx.categoryId)}
            onDelete={onDelete}
            isDeleting={isMutating}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} &middot; {transactions.length} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
