import { createFileRoute } from '@tanstack/react-router';
import { InventoryView } from '@/components/views/inventory-view/inventory-view';

export const Route = createFileRoute('/inventory')({
  component: InventoryView,
});
