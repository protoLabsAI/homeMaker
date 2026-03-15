/**
 * Chat Channel types — household family chat with Ava AI participant.
 *
 * Messages are stored in SQLite and broadcast via WebSocket in real-time.
 * Ava classifies incoming messages and responds only to home-management topics.
 */

/** Persisted chat message */
export interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  isAva: boolean;
  metadata: Record<string, unknown> | null;
}

/** Input for sending a new message */
export interface SendChatMessageInput {
  senderName: string;
  content: string;
}

/** Pagination options for loading message history */
export interface ChatMessageQuery {
  limit?: number;
  before?: string;
}

/** Classification result from Ava's message analysis */
export interface AvaClassification {
  isHomeManagement: boolean;
  contentHash: string;
}
