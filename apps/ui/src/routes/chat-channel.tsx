import { createFileRoute } from '@tanstack/react-router';
import { ChatChannelView } from '@/components/views/chat-channel-view/chat-channel-view';

export const Route = createFileRoute('/chat-channel')({
  component: ChatChannelView,
});
