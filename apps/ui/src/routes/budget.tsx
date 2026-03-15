import { createFileRoute } from '@tanstack/react-router';
import { BudgetView } from '@/components/views/budget-view';

export const Route = createFileRoute('/budget')({
  component: BudgetView,
});
