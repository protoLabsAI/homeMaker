/**
 * Chat Channel Routes — REST endpoints for household chat.
 *
 *   POST /             — send a new message
 *   GET  /             — load message history (optional query: limit, before)
 */

import { Router } from 'express';
import { createLogger } from '@protolabsai/utils';
import type { ChatChannelService } from '../../services/chat-channel-service.js';

const logger = createLogger('ChatChannelRoutes');

export function createChatChannelRoutes(chatChannelService: ChatChannelService): Router {
  const router = Router();

  /** POST /chat-channel — send a new message */
  router.post('/', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;

      if (!body.senderName || typeof body.senderName !== 'string' || !body.senderName.trim()) {
        res.status(400).json({
          success: false,
          error: 'senderName is required and must be a non-empty string',
        });
        return;
      }

      if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
        res.status(400).json({
          success: false,
          error: 'content is required and must be a non-empty string',
        });
        return;
      }

      const message = await chatChannelService.sendMessage(
        body.senderName.trim(),
        body.content.trim()
      );

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      logger.error('Failed to send message:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  });

  /** GET /chat-channel — load message history */
  router.get('/', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = req.query.before as string | undefined;

      if (isNaN(limit) || limit < 1) {
        res.status(400).json({
          success: false,
          error: 'limit must be a positive integer',
        });
        return;
      }

      const messages = chatChannelService.getMessages(limit, before);
      res.json({ success: true, data: messages });
    } catch (error) {
      logger.error('Failed to load messages:', error);
      res.status(500).json({ success: false, error: 'Failed to load messages' });
    }
  });

  return router;
}
