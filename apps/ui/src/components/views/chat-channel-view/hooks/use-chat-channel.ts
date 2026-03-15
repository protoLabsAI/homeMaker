/**
 * useChatChannel — manages chat message state, pagination, and real-time updates.
 *
 * Fetches message history from the REST API and subscribes to WebSocket events
 * for real-time delivery of new messages. Provides pagination via `loadMore`.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { ChatMessage, EventType } from '@protolabsai/types';

interface MessageListResponse {
  success: boolean;
  data: ChatMessage[];
  error?: string;
}

interface SendMessageResponse {
  success: boolean;
  data?: ChatMessage;
  error?: string;
}

const PAGE_SIZE = 50;

interface UseChatChannelResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (senderName: string, content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useChatChannel(): UseChatChannelResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const fetchIdRef = useRef(0);
  /** Track known message IDs to deduplicate WebSocket updates */
  const knownIdsRef = useRef(new Set<string>());

  // Initial fetch
  const fetchMessages = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiGet<MessageListResponse>(`/api/chat-channel?limit=${PAGE_SIZE}`);

      if (fetchId !== fetchIdRef.current) return;

      if (result.success) {
        // API returns newest-first; reverse for chronological display
        const chronological = [...result.data].reverse();
        setMessages(chronological);
        setHasMore(result.data.length >= PAGE_SIZE);

        knownIdsRef.current.clear();
        for (const msg of chronological) {
          knownIdsRef.current.add(msg.id);
        }
      } else {
        setError(result.error ?? 'Failed to fetch messages');
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Subscribe to WebSocket for real-time messages
  useEffect(() => {
    const api = getHttpApiClient();

    const unsubscribe = api.subscribeToEvents((type: EventType, payload: unknown) => {
      if (type !== 'chat:message-received') return;

      const data = payload as { message?: ChatMessage };
      if (!data.message) return;

      // Deduplicate: skip if we already have this message
      if (knownIdsRef.current.has(data.message.id)) return;

      knownIdsRef.current.add(data.message.id);
      setMessages((prev) => [...prev, data.message!]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (senderName: string, content: string) => {
    try {
      const result = await apiPost<SendMessageResponse>('/api/chat-channel', {
        senderName,
        content,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to send message');
      }

      // The message will arrive via WebSocket — no need to manually append
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || messages.length === 0) return;

    const oldestMessage = messages[0];
    try {
      const result = await apiGet<MessageListResponse>(
        `/api/chat-channel?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldestMessage.timestamp)}`
      );

      if (result.success) {
        // Prepend older messages (API returns newest-first, so reverse)
        const olderChronological = [...result.data].reverse();
        setMessages((prev) => [...olderChronological, ...prev]);
        setHasMore(result.data.length >= PAGE_SIZE);

        for (const msg of olderChronological) {
          knownIdsRef.current.add(msg.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    }
  }, [hasMore, isLoading, messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMore,
    hasMore,
  };
}
