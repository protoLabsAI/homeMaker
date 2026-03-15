/**
 * AvaClassifier — determines whether a chat message is about home management.
 *
 * Uses Claude Haiku for fast, low-cost classification. Results are cached
 * by content hash to avoid re-classifying identical messages.
 */

import { createHash } from 'node:crypto';
import { createLogger } from '@protolabsai/utils';
import { simpleQuery } from '../providers/simple-query-service.js';

const logger = createLogger('AvaClassifier');

/** Haiku model for fast classification */
const CLASSIFIER_MODEL = 'claude-haiku-4-20250514';

const CLASSIFICATION_PROMPT =
  'Is this message asking about or discussing home management? Reply YES or NO only.';

export class AvaClassifier {
  private cache: Map<string, boolean> = new Map();

  /**
   * Classify a message as home-management related or not.
   * Returns true if the message is about home management.
   */
  async classify(content: string): Promise<boolean> {
    const hash = this.hashContent(content);

    const cached = this.cache.get(hash);
    if (cached !== undefined) {
      logger.info(`Cache hit for message hash ${hash.slice(0, 8)}: ${cached}`);
      return cached;
    }

    try {
      const result = await simpleQuery({
        prompt: `Message: "${content}"\n\n${CLASSIFICATION_PROMPT}`,
        model: CLASSIFIER_MODEL,
        cwd: process.cwd(),
        maxTurns: 1,
        allowedTools: [],
      });

      const answer = result.text.trim().toUpperCase();
      const isHomeManagement = answer.startsWith('YES');

      this.cache.set(hash, isHomeManagement);
      logger.info(
        `Classified message (${hash.slice(0, 8)}): ${isHomeManagement ? 'home-management' : 'casual'}`
      );

      return isHomeManagement;
    } catch (error) {
      logger.error('Classification failed, defaulting to false:', error);
      return false;
    }
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content.toLowerCase().trim()).digest('hex');
  }
}
