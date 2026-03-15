import { createFileRoute } from '@tanstack/react-router';
import { VaultView } from '@/components/views/vault-view';

export const Route = createFileRoute('/vault')({
  component: VaultView,
});
