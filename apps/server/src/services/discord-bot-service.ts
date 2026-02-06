/**
 * Discord Bot Service - Connects to Discord for CTO interaction
 *
 * Provides the `/idea` slash command and message-prefix command (`!idea`)
 * so the CTO can inject ideas directly from Discord. When an idea is
 * processed by the PM agent, the PRD is posted back to Discord for approval.
 *
 * Setup:
 * 1. Set DISCORD_BOT_TOKEN in .env or environment
 * 2. Invite bot to server with scopes: bot, applications.commands
 * 3. Bot permissions: Send Messages, Read Message History, Add Reactions,
 *    Use Slash Commands, Manage Messages
 *
 * The service is optional - if no token is configured, it logs a warning
 * and the rest of the server operates normally.
 */

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  type Interaction,
  type Message,
  type TextChannel,
  Events,
} from 'discord.js';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../lib/events.js';
import type { AuthorityService } from './authority-service.js';
import type { FeatureLoader } from './feature-loader.js';

const logger = createLogger('DiscordBot');

/** Channel IDs from docs/discord.md */
const CHANNELS = {
  suggestions: '1469049473756954645',
  projectPlanning: '1469049525975908477',
  agentLogs: '1469049504039702668',
  codeReview: '1469049502550720896',
} as const;

/** Guild ID from docs/discord.md */
const GUILD_ID = '1070606339363049492';

/** Message prefix alternative to slash command */
const IDEA_PREFIX = '!idea ';

/** Pending ideas waiting for PRD completion, keyed by featureId */
interface PendingIdea {
  channelId: string;
  interactionToken?: string;
  messageId?: string;
  userId: string;
  title: string;
  createdAt: number;
}

export class DiscordBotService {
  private readonly events: EventEmitter;
  private readonly authorityService: AuthorityService;
  private readonly featureLoader: FeatureLoader;
  private readonly projectPath: string;

  private client: Client | null = null;
  private initialized = false;

  /** Track pending ideas to post PRD results back */
  private pendingIdeas = new Map<string, PendingIdea>();

  /** Track approval messages to map reactions to feature IDs */
  private approvalMessages = new Map<string, { featureId: string; projectPath: string }>();

  constructor(
    events: EventEmitter,
    authorityService: AuthorityService,
    featureLoader: FeatureLoader,
    projectPath: string
  ) {
    this.events = events;
    this.authorityService = authorityService;
    this.featureLoader = featureLoader;
    this.projectPath = projectPath;
  }

  /**
   * Initialize the Discord bot. Requires DISCORD_BOT_TOKEN in environment.
   * Returns false if token is not configured (non-fatal).
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      logger.info('DISCORD_BOT_TOKEN not set - Discord bot features disabled');
      logger.info('Set DISCORD_BOT_TOKEN in .env to enable /idea command in Discord');
      return false;
    }

    try {
      // Create Discord client with necessary intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMessageReactions,
        ],
      });

      // Set up event handlers
      this.client.once(Events.ClientReady, (readyClient) => {
        logger.info(`Discord bot connected as ${readyClient.user.tag}`);
        void this.registerSlashCommands(token);
      });

      this.client.on(Events.InteractionCreate, (interaction) => {
        void this.handleInteraction(interaction);
      });

      this.client.on(Events.MessageCreate, (message) => {
        void this.handleMessage(message);
      });

      this.client.on(Events.MessageReactionAdd, (reaction, user) => {
        if (user.bot) return;
        void this.handleReaction(reaction.message.id, reaction.emoji.name || '', user.id, true);
      });

      // Listen for PM agent completion events
      this.listenForAgentEvents();

      // Connect to Discord
      await this.client.login(token);
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Discord bot:', error);
      this.client = null;
      return false;
    }
  }

  /**
   * Register slash commands with Discord.
   */
  private async registerSlashCommands(token: string): Promise<void> {
    try {
      if (!this.client?.user) return;

      const commands = [
        new SlashCommandBuilder()
          .setName('idea')
          .setDescription('Submit a feature idea for the team to build')
          .addStringOption((option) =>
            option.setName('title').setDescription('Short title for the idea').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('description')
              .setDescription('Detailed description of what you want built')
              .setRequired(false)
          ),

        new SlashCommandBuilder()
          .setName('dashboard')
          .setDescription('View the CTO dashboard - agents, approvals, pipeline status'),

        new SlashCommandBuilder()
          .setName('approve')
          .setDescription('Approve a pending approval request')
          .addStringOption((option) =>
            option.setName('id').setDescription('Approval request ID').setRequired(true)
          ),

        new SlashCommandBuilder()
          .setName('reject')
          .setDescription('Reject a pending approval request')
          .addStringOption((option) =>
            option.setName('id').setDescription('Approval request ID').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for rejection').setRequired(false)
          ),
      ];

      const rest = new REST({ version: '10' }).setToken(token);

      // Register commands for the specific guild (instant, no 1-hour cache)
      await rest.put(Routes.applicationGuildCommands(this.client.user.id, GUILD_ID), {
        body: commands.map((cmd) => cmd.toJSON()),
      });

      logger.info(`Registered ${commands.length} slash commands for guild ${GUILD_ID}`);
    } catch (error) {
      logger.error('Failed to register slash commands:', error);
    }
  }

  /**
   * Handle slash command interactions.
   */
  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case 'idea':
        await this.handleIdeaCommand(interaction);
        break;
      case 'dashboard':
        await this.handleDashboardCommand(interaction);
        break;
      case 'approve':
        await this.handleApproveCommand(interaction);
        break;
      case 'reject':
        await this.handleRejectCommand(interaction);
        break;
    }
  }

  /**
   * Handle /idea slash command.
   */
  private async handleIdeaCommand(interaction: any): Promise<void> {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || '';

    if (!title) {
      await interaction.reply({ content: 'Title is required.', ephemeral: true });
      return;
    }

    // Acknowledge immediately (Discord requires response within 3 seconds)
    await interaction.deferReply();

    try {
      const result = await this.injectIdea(title, description, interaction.user.id);

      if (result.success) {
        await interaction.editReply(
          `**Idea submitted:** "${title}"\n` +
            `**Feature ID:** \`${result.featureId}\`\n` +
            `The PM agent is researching this idea. I'll post the PRD here when it's ready for your approval.`
        );

        // Track this idea for PRD followup
        this.pendingIdeas.set(result.featureId!, {
          channelId: interaction.channelId,
          userId: interaction.user.id,
          title,
          createdAt: Date.now(),
        });
      } else {
        await interaction.editReply(`Failed to submit idea: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error handling /idea command:', error);
      await interaction.editReply('An error occurred while submitting your idea.');
    }
  }

  /**
   * Handle /dashboard slash command.
   */
  private async handleDashboardCommand(interaction: any): Promise<void> {
    await interaction.deferReply();

    try {
      const lines: string[] = [];
      lines.push('**CTO Dashboard**\n');

      // Agents
      const agents = await this.authorityService.getAgents(this.projectPath);
      lines.push('**Agents:**');
      if (agents.length === 0) {
        lines.push('  No agents registered');
      } else {
        for (const agent of agents) {
          lines.push(`  ${agent.role} - trust: ${agent.trust}, status: ${agent.status}`);
        }
      }

      // Pending approvals
      const pendingApprovals = await this.authorityService.getPendingApprovals(this.projectPath);
      lines.push('\n**Pending Approvals:**');
      if (pendingApprovals.length === 0) {
        lines.push('  None');
      } else {
        for (const approval of pendingApprovals.slice(0, 5)) {
          lines.push(
            `  \`${approval.id}\` - ${approval.proposal.what} on ${approval.proposal.target} (${approval.proposal.risk} risk)`
          );
        }
      }

      // Pipeline
      lines.push('\n**Idea Pipeline:**');
      const features = await this.featureLoader.getAll(this.projectPath);
      const ideas = features.filter((f) => f.workItemState === 'idea');
      const researching = features.filter((f) => f.workItemState === 'research');
      const planned = features.filter((f) => f.workItemState === 'planned');
      const ready = features.filter((f) => f.workItemState === 'ready');
      const inProgress = features.filter((f) => f.workItemState === 'in_progress');

      lines.push(
        `  Ideas: ${ideas.length} | Researching: ${researching.length} | Planned: ${planned.length}`
      );
      lines.push(`  Ready: ${ready.length} | In Progress: ${inProgress.length}`);

      await interaction.editReply(lines.join('\n'));
    } catch (error) {
      logger.error('Error handling /dashboard command:', error);
      await interaction.editReply('Failed to load dashboard.');
    }
  }

  /**
   * Handle /approve slash command.
   */
  private async handleApproveCommand(interaction: any): Promise<void> {
    const requestId = interaction.options.getString('id');
    if (!requestId) {
      await interaction.reply({ content: 'Approval ID is required.', ephemeral: true });
      return;
    }

    try {
      await this.authorityService.resolveApproval(requestId, 'approve', 'cto', this.projectPath);
      await interaction.reply(`Approved: \`${requestId}\``);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `Failed to approve: ${msg}`, ephemeral: true });
    }
  }

  /**
   * Handle /reject slash command.
   */
  private async handleRejectCommand(interaction: any): Promise<void> {
    const requestId = interaction.options.getString('id');
    const reason = interaction.options.getString('reason') || 'Rejected by CTO';
    if (!requestId) {
      await interaction.reply({ content: 'Approval ID is required.', ephemeral: true });
      return;
    }

    try {
      await this.authorityService.resolveApproval(requestId, 'reject', 'cto', this.projectPath);
      await interaction.reply(`Rejected: \`${requestId}\` - ${reason}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await interaction.reply({ content: `Failed to reject: ${msg}`, ephemeral: true });
    }
  }

  /**
   * Handle message-prefix commands (!idea ...).
   */
  private async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;

    const content = message.content.trim();

    if (content.startsWith(IDEA_PREFIX)) {
      const ideaText = content.slice(IDEA_PREFIX.length).trim();
      if (!ideaText) {
        await message.reply('Usage: `!idea <title> | <description>` or `!idea <title>`');
        return;
      }

      // Parse title and optional description separated by |
      const [title, ...descParts] = ideaText.split('|');
      const description = descParts.join('|').trim();

      try {
        const result = await this.injectIdea(title.trim(), description, message.author.id);

        if (result.success) {
          const reply = await message.reply(
            `**Idea submitted:** "${title.trim()}"\n` +
              `**Feature ID:** \`${result.featureId}\`\n` +
              `PM agent is researching... I'll follow up with the PRD.`
          );

          this.pendingIdeas.set(result.featureId!, {
            channelId: message.channelId,
            messageId: reply.id,
            userId: message.author.id,
            title: title.trim(),
            createdAt: Date.now(),
          });
        } else {
          await message.reply(`Failed: ${result.error}`);
        }
      } catch (error) {
        logger.error('Error handling !idea command:', error);
        await message.reply('Error submitting idea.');
      }
    }
  }

  /**
   * Inject an idea through the authority system.
   */
  private async injectIdea(
    title: string,
    description: string,
    userId: string
  ): Promise<{ success: boolean; featureId?: string; error?: string }> {
    try {
      // Create feature in 'idea' state via the inject-idea pipeline
      const feature = await this.featureLoader.create(this.projectPath, {
        title,
        description: description || title,
        status: 'backlog',
        workItemState: 'idea',
        category: 'Authority Ideas',
      });

      // Emit the idea-injected event for PM agent to pick up
      this.events.emit('authority:idea-injected', {
        projectPath: this.projectPath,
        featureId: feature.id,
        title,
        description: description || title,
        injectedBy: `discord:${userId}`,
        injectedAt: new Date().toISOString(),
      });

      logger.info(`Idea injected via Discord: "${title}" (${feature.id}) by user ${userId}`);
      return { success: true, featureId: feature.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to inject idea "${title}":`, error);
      return { success: false, error: msg };
    }
  }

  /**
   * Listen for PM agent events to post PRD results back to Discord.
   */
  private listenForAgentEvents(): void {
    this.events.subscribe((type, payload) => {
      if (type === 'authority:pm-research-completed') {
        const data = payload as Record<string, unknown>;
        const featureId = data.featureId as string;
        if (featureId && this.pendingIdeas.has(featureId)) {
          void this.postPRDResult(featureId);
        }
      }

      if (type === 'authority:pm-epic-created') {
        const data = payload as Record<string, unknown>;
        const epicId = data.epicId as string;
        if (epicId && this.pendingIdeas.has(epicId)) {
          void this.postEpicCreated(epicId, data);
        }
      }

      // Post approval requests to Discord
      if (type === 'authority:awaiting-approval') {
        void this.postApprovalRequest(payload as Record<string, unknown>);
      }
    });
  }

  /**
   * Post PRD/analysis results back to the Discord channel.
   */
  private async postPRDResult(featureId: string): Promise<void> {
    const pending = this.pendingIdeas.get(featureId);
    if (!pending || !this.client) return;

    try {
      const feature = await this.featureLoader.get(this.projectPath, featureId);
      if (!feature) return;

      const channel = (await this.client.channels.fetch(pending.channelId)) as TextChannel;
      if (!channel?.isTextBased()) return;

      // Build PRD message
      const lines: string[] = [];
      lines.push(`**PRD Ready: "${pending.title}"**`);
      lines.push(`<@${pending.userId}> - The PM agent has analyzed your idea.\n`);

      // Include the enhanced description (PRD)
      const desc = feature.description || 'No description generated.';
      // Truncate to Discord's 2000 char limit
      const truncatedDesc = desc.length > 1500 ? desc.slice(0, 1500) + '\n...(truncated)' : desc;
      lines.push(truncatedDesc);

      lines.push(`\n**Complexity:** ${feature.complexity || 'TBD'}`);
      lines.push(`**Status:** ${feature.workItemState || 'planned'}`);
      lines.push(`\nReact with ✅ to approve or ❌ to reject.`);

      const msg = await channel.send(lines.join('\n'));

      // Add approval reactions
      await msg.react('✅');
      await msg.react('❌');

      // Track this message for reaction handling
      this.approvalMessages.set(msg.id, {
        featureId,
        projectPath: this.projectPath,
      });

      this.pendingIdeas.delete(featureId);
      logger.info(`PRD posted to Discord for "${pending.title}"`);
    } catch (error) {
      logger.error(`Failed to post PRD result for ${featureId}:`, error);
    }
  }

  /**
   * Post epic creation notification.
   */
  private async postEpicCreated(epicId: string, data: Record<string, unknown>): Promise<void> {
    const pending = this.pendingIdeas.get(epicId);
    if (!pending || !this.client) return;

    try {
      const channel = (await this.client.channels.fetch(pending.channelId)) as TextChannel;
      if (!channel?.isTextBased()) return;

      const childCount = data.childCount as number;
      await channel.send(
        `**Epic Created:** "${pending.title}"\n` +
          `Decomposed into **${childCount}** child features.\n` +
          `The ProjM agent will now set up dependencies, and the EM agent will assign work.`
      );
    } catch (error) {
      logger.error(`Failed to post epic notification for ${epicId}:`, error);
    }
  }

  /**
   * Post approval requests to Discord.
   */
  private async postApprovalRequest(data: Record<string, unknown>): Promise<void> {
    if (!this.client) return;

    try {
      const channel = (await this.client.channels.fetch(CHANNELS.projectPlanning)) as TextChannel;
      if (!channel?.isTextBased()) return;

      const proposal = data.proposal as Record<string, unknown>;
      const decision = data.decision as Record<string, unknown>;
      const requestId = data.requestId as string;
      const featureTitle = data.featureTitle as string;

      const riskEmoji: Record<string, string> = {
        low: '🟢',
        medium: '🟡',
        high: '🔴',
        critical: '⛔',
      };

      const risk = proposal?.risk as string;
      const emoji = riskEmoji[risk] || '❓';

      const lines: string[] = [];
      lines.push(`${emoji} **Approval Required**`);
      lines.push(`**Feature:** ${featureTitle || proposal?.target}`);
      lines.push(`**Action:** \`${proposal?.what}\``);
      lines.push(`**Risk:** ${risk}`);
      lines.push(`**Reason:** ${decision?.reason}`);

      if (requestId) {
        lines.push(`\nUse \`/approve id:${requestId}\` or \`/reject id:${requestId}\``);
      }

      await channel.send(lines.join('\n'));
    } catch (error) {
      logger.error('Failed to post approval request to Discord:', error);
    }
  }

  /**
   * Handle reaction-based approval/rejection.
   */
  private async handleReaction(
    messageId: string,
    emoji: string,
    userId: string,
    _added: boolean
  ): Promise<void> {
    const approval = this.approvalMessages.get(messageId);
    if (!approval) return;

    if (emoji === '✅') {
      // Approve - transition the idea/feature forward
      logger.info(`Feature ${approval.featureId} approved via Discord reaction by ${userId}`);

      // Emit approval event
      this.events.emit('authority:approved', {
        projectPath: approval.projectPath,
        featureId: approval.featureId,
        approvedBy: `discord:${userId}`,
        method: 'reaction',
      });

      // Post confirmation
      try {
        const feature = await this.featureLoader.get(approval.projectPath, approval.featureId);
        const channel = this.client?.channels.cache.get(
          this.pendingIdeas.get(approval.featureId)?.channelId || CHANNELS.suggestions
        ) as TextChannel;
        if (channel) {
          await channel.send(
            `✅ **Approved:** "${feature?.title || approval.featureId}"\n` +
              `Moving to decomposition and assignment pipeline.`
          );
        }
      } catch {
        // Non-fatal
      }

      this.approvalMessages.delete(messageId);
    } else if (emoji === '❌') {
      // Reject
      logger.info(`Feature ${approval.featureId} rejected via Discord reaction by ${userId}`);

      try {
        await this.featureLoader.update(approval.projectPath, approval.featureId, {
          status: 'done',
          workItemState: 'done',
          error: 'Rejected by CTO via Discord',
        });

        const feature = await this.featureLoader.get(approval.projectPath, approval.featureId);
        const channel = this.client?.channels.cache.get(CHANNELS.suggestions) as TextChannel;
        if (channel) {
          await channel.send(`❌ **Rejected:** "${feature?.title || approval.featureId}"`);
        }
      } catch {
        // Non-fatal
      }

      this.approvalMessages.delete(messageId);
    }
  }

  /**
   * Send a message to a specific channel.
   */
  async sendToChannel(channelId: string, content: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const channel = (await this.client.channels.fetch(channelId)) as TextChannel;
      if (!channel?.isTextBased()) return false;
      await channel.send(content);
      return true;
    } catch (error) {
      logger.error(`Failed to send to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Check if the bot is connected.
   */
  isConnected(): boolean {
    return this.client?.isReady() ?? false;
  }

  /**
   * Gracefully disconnect the bot.
   */
  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.initialized = false;
      logger.info('Discord bot disconnected');
    }
  }
}
