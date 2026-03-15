/**
 * Add Transaction Dialog
 *
 * Form for creating a new transaction with type, amount, category,
 * description, date, and optional recurrence.
 */

import { useState, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@protolabsai/ui/atoms';
import type { BudgetCategory, TransactionRecurrence } from '@protolabsai/types';
import type { CreateTransactionInput } from './hooks/use-budget';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  defaultMonth: string;
  isMutating: boolean;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  categories,
  defaultMonth,
  isMutating,
  onSubmit,
}: AddTransactionDialogProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => {
    const [y, m] = defaultMonth.split('-');
    const today = new Date();
    if (today.getFullYear() === Number(y) && today.getMonth() + 1 === Number(m)) {
      return today.toISOString().slice(0, 10);
    }
    return `${y}-${m}-01`;
  });
  const [recurrence, setRecurrence] = useState<TransactionRecurrence | 'none'>('none');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountFloat = parseFloat(amountStr);
    if (!amountStr || isNaN(amountFloat) || amountFloat <= 0) {
      setFormError('Enter a valid positive amount.');
      return;
    }
    if (!categoryId) {
      setFormError('Select a category.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError('Enter a valid date.');
      return;
    }

    const amountCents = Math.round(amountFloat * 100);

    try {
      await onSubmit({
        type,
        amount: amountCents,
        categoryId,
        description: description.trim(),
        date,
        recurrence: recurrence === 'none' ? null : recurrence,
      });
      // Reset form on success
      setType('expense');
      setAmountStr('');
      setCategoryId('');
      setDescription('');
      setRecurrence('none');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="tx-type">Type</Label>
            <Select value={type} onValueChange={(v: string) => setType(v as 'income' | 'expense')}>
              <SelectTrigger id="tx-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="tx-amount">Amount ($)</Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAmountStr(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="tx-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              placeholder="e.g. Grocery run"
              value={description}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label htmlFor="tx-recurrence">Recurrence</Label>
            <Select
              value={recurrence}
              onValueChange={(v: string) => setRecurrence(v as TransactionRecurrence | 'none')}
            >
              <SelectTrigger id="tx-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isMutating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isMutating}>
              Add Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
