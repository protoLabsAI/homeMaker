/**
 * ChatChannelService — SQLite-backed household chat with Ava AI integration.
 *
 * Manages the family chat channel where household members communicate and
 * Ava participates as an intelligent AI assistant. Each human message is:
 *   1. Persisted to the chat_messages table
 *   2. Broadcast to all connected clients via WebSocket
 *   3. Classified by AvaClassifier (home-management or casual)
 *   4. If home-management: passed to AvaResponder for a contextual reply
 *
 * Ava's response frequency is governed by a RateLimiter to prevent
 * dominating the conversation.
 */

import { randomUUID } from 'node:crypto';
import * as BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '@protolabsai/utils';
import type { ChatMessage } from '@protolabsai/types';
import type { EventEmitter } from '../lib/events.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import type { AvaClassifier } from './ava-classifier.js';
import type { AvaResponder } from './ava-responder.js';

const logger = createLogger('ChatChannelService');

const AVA_RATE_LIMIT_KEY = 'ava-chat-response';

/** Row shape returned by SQLite for message queries */
interface MessageRow {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  isAva: number;
  metadata: string | null;
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderName: row.senderName,
    content: row.content,
    timestamp: row.timestamp,
    isAva: row.isAva === 1,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
  };
}

export class ChatChannelService {
  private db: BetterSqlite3.Database;
  private events: EventEmitter;
  private classifier: AvaClassifier;
  private responder: AvaResponder;
  private rateLimiter: RateLimiter;

  constructor(deps: {
    db: BetterSqlite3.Database;
    events: EventEmitter;
    classifier: AvaClassifier;
    responder: AvaResponder;
  }) {
    this.db = deps.db;
    this.events = deps.events;
    this.classifier = deps.classifier;
    this.responder = deps.responder;
    this.rateLimiter = new RateLimiter({
      cooldownSeconds: 60,
      maxPerHour: 10,
    });
    this.ensureSchema();
  }

  /**
   * Idempotently create the chat_messages table and indexes.
   */
  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        senderName TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        isAva INTEGER NOT NULL DEFAULT 0,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_senderName ON chat_messages(senderName);
    `);
    logger.info('Chat messages schema initialized');
  }

  /**
   * Send a message from a household member.
   * Persists the message, broadcasts it, then triggers Ava analysis asynchronously.
   */
  async sendMessage(senderName: string, content: string): Promise<ChatMessage> {
    const message = this.persistMessage(senderName, content, false, null);

    this.events.emit('chat:message-received', { message });
    logger.info(`Message from ${senderName}: "${content.slice(0, 50)}..."`);

    // Trigger Ava analysis in the background (non-blocking)
    void this.triggerAvaResponse(senderName, content);

    return message;
  }

  /**
   * Load paginated message history, ordered by newest first.
   */
  getMessages(limit: number = 50, before?: string): ChatMessage[] {
    const safeLimit = Math.min(Math.max(1, limit), 200);

    if (before) {
      const rows = this.db
        .prepare(
          `SELECT * FROM chat_messages
           WHERE timestamp < ?
           ORDER BY timestamp DESC
           LIMIT ?`
        )
        .all(before, safeLimit) as MessageRow[];
      return rows.map(toMessage);
    }

    const rows = this.db
      .prepare(
        `SELECT * FROM chat_messages
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(safeLimit) as MessageRow[];
    return rows.map(toMessage);
  }

  /**
   * Classify the message and generate an Ava response if appropriate.
   */
  private async triggerAvaResponse(senderName: string, content: string): Promise<void> {
    try {
      const isHomeManagement = await this.classifier.classify(content);
      if (!isHomeManagement) {
        logger.info('Message classified as casual — Ava will not respond');
        return;
      }

      const limitResult = this.rateLimiter.check(AVA_RATE_LIMIT_KEY);
      if (!limitResult.allowed) {
        logger.info(`Ava response rate-limited: ${limitResult.reason}`);
        return;
      }

      const responseText = await this.responder.respond(senderName, content);
      const avaMessage = this.persistMessage('Ava', responseText, true, {
        respondingTo: senderName,
        triggerContent: content.slice(0, 100),
      });

      this.events.emit('chat:message-received', { message: avaMessage });
      logger.info(`Ava responded to ${senderName}`);
    } catch (error) {
      logger.error('Ava response pipeline failed:', error);
    }
  }

  /**
   * Persist a message to the database and return the ChatMessage object.
   */
  private persistMessage(
    senderName: string,
    content: string,
    isAva: boolean,
    metadata: Record<string, unknown> | null
  ): ChatMessage {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    this.db
      .prepare(
        `INSERT INTO chat_messages (id, senderName, content, timestamp, isAva, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, senderName, content, timestamp, isAva ? 1 : 0, metadataJson);

    return {
      id,
      senderName,
      content,
      timestamp,
      isAva,
      metadata,
    };
  }
}
