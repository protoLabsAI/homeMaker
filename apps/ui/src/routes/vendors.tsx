import { createFileRoute } from '@tanstack/react-router';
import { VendorsView } from '@/components/views/vendors-view';

export const Route = createFileRoute('/vendors')({
  component: VendorsView,
});
