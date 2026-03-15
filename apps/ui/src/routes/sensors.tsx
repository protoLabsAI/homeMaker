import { createFileRoute } from '@tanstack/react-router';
import { SensorsView } from '@/components/views/sensors-view';

export const Route = createFileRoute('/sensors')({
  component: SensorsView,
});
