import { createFileRoute } from '@tanstack/react-router';
import { MaintenanceView } from '@/components/views/maintenance-view';

export const Route = createFileRoute('/maintenance')({
  component: MaintenanceView,
});
