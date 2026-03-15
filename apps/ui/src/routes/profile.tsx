import { createFileRoute } from '@tanstack/react-router';
import { ProfileView } from '@/components/views/profile-view/profile-view';

export const Route = createFileRoute('/profile')({
  component: ProfileView,
});
