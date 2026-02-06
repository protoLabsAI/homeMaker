/**
 * Discord Approval Router - Posts authority approval requests to Discord
 *
 * Listens for 'authority:awaiting-approval' events and posts formatted
 * messages to a Discord channel. The CTO (human user) can then approve
 * or reject via the API.
 *
 * This service uses the event system to trigger Discord notifications.
 * It emits 'integration:discord' events that can be consumed by the
 * integration service or MCP tools.
 *
 * Future: reaction-based approve/reject via Discord bot.
 */

import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../lib/events.js';
import type { ActionProposal, PolicyDecision, AuthorityRole } from '@automaker/types';

const logger = createLogger('DiscordApprovalRouter');

/** Role display names for Discord messages */
const ROLE_DISPLAY_NAMES: Record<AuthorityRole, string> = {
  cto: 'CTO',
  'product-manager': 'Product Manager',
  'project-manager': 'Project Manager',
  'engineering-manager': 'Engineering Manager',
  'principal-engineer': 'Principal Engineer',
};

/** Risk level emoji mapping */
const RISK_EMOJI: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
  critical: '⛔',
};

interface ApprovalEventPayload {
  projectPath: string;
  proposal: ActionProposal;
  decision: PolicyDecision;
  requestId?: string;
  blockerType?: string;
  featureTitle?: string;
}

export class DiscordApprovalRouter {
  private readonly events: EventEmitter;
  private initialized = false;

  constructor(events: EventEmitter) {
    this.events = events;
  }

  /**
   * Start listening for approval events and routing to Discord.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.events.subscribe((type, payload) => {
      if (type === 'authority:awaiting-approval') {
        void this.handleAwaitingApproval(payload as ApprovalEventPayload);
      }
    });

    logger.info('Discord approval router initialized');
  }

  /**
   * Format and emit a Discord notification for an approval request.
   */
  private async handleAwaitingApproval(payload: ApprovalEventPayload): Promise<void> {
    try {
      const { proposal, decision, requestId, blockerType, featureTitle } = payload;

      const riskEmoji = RISK_EMOJI[proposal.risk] || '❓';
      const title = featureTitle || proposal.target;

      // Build formatted message
      const lines: string[] = [];

      if (blockerType) {
        lines.push(`⚠️ **BLOCKER DETECTED** - ${blockerType.toUpperCase()}`);
      } else {
        lines.push(`📋 **Approval Required**`);
      }

      lines.push('');
      lines.push(`**Feature:** ${title}`);
      lines.push(`**Action:** \`${proposal.what}\``);
      lines.push(`**Risk:** ${riskEmoji} ${proposal.risk}`);
      lines.push(`**Reason:** ${decision.reason}`);
      lines.push(`**Justification:** ${proposal.justification}`);

      if (proposal.statusTransition) {
        lines.push(
          `**Transition:** ${proposal.statusTransition.from} → ${proposal.statusTransition.to}`
        );
      }

      if (requestId) {
        lines.push('');
        lines.push(`**Approval ID:** \`${requestId}\``);
        lines.push('```');
        lines.push(`curl -X POST localhost:3008/api/authority/resolve \\`);
        lines.push(`  -H "Content-Type: application/json" \\`);
        lines.push(
          `  -d '{"requestId":"${requestId}","resolution":"approve","resolvedBy":"cto","projectPath":"${payload.projectPath}"}'`
        );
        lines.push('```');
      }

      const message = lines.join('\n');

      // Emit as integration:discord event for consumption
      this.events.emit('integration:discord', {
        action: 'send_message',
        projectPath: payload.projectPath,
        message,
        channel: 'approvals', // Channel hint - integration service maps to actual ID
        priority: proposal.risk === 'high' || proposal.risk === 'critical' ? 'high' : 'normal',
      });

      logger.info(`Approval request routed to Discord: ${title} (${proposal.what})`);
    } catch (error) {
      logger.error('Failed to route approval to Discord:', error);
    }
  }
}
