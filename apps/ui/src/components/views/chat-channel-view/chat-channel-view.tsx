/**
 * ChatChannelView — household family chat with Ava AI.
 *
 * Composes MessageBubble list with MessageInput. Provides auto-scroll
 * on new messages and a scroll-to-bottom button when the user scrolls up.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@protolabsai/ui/atoms';
import { ErrorState } from '@protolabsai/ui/molecules';
import { PanelHeader } from '@/components/shared/panel-header';
import { useChatChannel } from './hooks/use-chat-channel';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';

/** Distance from bottom (px) within which auto-scroll stays active */
const AUTO_SCROLL_THRESHOLD = 150;

export function ChatChannelView() {
  const { messages, isLoading, error, sendMessage, loadMore, hasMore } = useChatChannel();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Track scroll position to decide auto-scroll behavior
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < AUTO_SCROLL_THRESHOLD;

    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 0);

    // Load more when scrolled near the top
    if (container.scrollTop < 100 && hasMore) {
      void loadMore();
    }
  }, [hasMore, loadMore, messages.length]);

  // Auto-scroll when new messages arrive and user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isNearBottom]);

  // Initial scroll to bottom on first load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = useCallback(
    (senderName: string, content: string) => {
      void sendMessage(senderName, content);
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Family Chat" icon={MessageCircle} />

      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="p-4">
            <ErrorState error={error} />
          </div>
        )}

        {/* Message list */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        >
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No messages yet. Start a conversation!</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Scroll-to-bottom FAB */}
        {showScrollButton && (
          <div className="absolute bottom-20 right-6 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              className="rounded-full h-8 w-8 p-0 shadow-md"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        <MessageInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
