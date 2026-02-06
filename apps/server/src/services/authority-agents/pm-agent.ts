/**
 * PM Authority Agent - Product Manager AI Agent
 *
 * First AI executive in the authority hierarchy. Responsible for:
 * - Picking up injected ideas (workItemState='idea')
 * - Researching and analyzing ideas
 * - Creating structured requirements / PRD summaries
 * - Transitioning ideas through: idea → research → planned
 * - Creating epics for large features
 *
 * The PM agent listens for 'authority:idea-injected' events and processes
 * ideas through the authority proposal system, respecting trust and policy.
 *
 * All state transitions go through AuthorityService.submitProposal() so they
 * are subject to policy checks and approval workflows.
 */

import type { Feature } from '@automaker/types';
import type { AuthorityAgent } from '@automaker/types';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../lib/events.js';
import type { AuthorityService } from '../authority-service.js';
import type { FeatureLoader } from '../feature-loader.js';

const logger = createLogger('PMAgent');

/** How long to wait before processing a new idea (debounce) */
const IDEA_PROCESSING_DELAY_MS = 2000;

interface IdeaInjectedPayload {
  projectPath: string;
  featureId: string;
  title: string;
  description: string;
  injectedBy: string;
  injectedAt: string;
}

export class PMAuthorityAgent {
  private readonly events: EventEmitter;
  private readonly authorityService: AuthorityService;
  private readonly featureLoader: FeatureLoader;

  /** Registered agent identities per project */
  private agents = new Map<string, AuthorityAgent>();

  /** Track initialized projects to avoid double-registration */
  private initializedProjects = new Set<string>();

  /** Track which ideas are being processed to avoid duplicates */
  private processing = new Set<string>();

  /** Whether the global event listener has been registered */
  private listenerRegistered = false;

  constructor(
    events: EventEmitter,
    authorityService: AuthorityService,
    featureLoader: FeatureLoader
  ) {
    this.events = events;
    this.authorityService = authorityService;
    this.featureLoader = featureLoader;

    // Register the global idea listener once
    this.registerEventListener();
  }

  /**
   * Register a single global event listener for idea-injected events.
   * Routes to the correct project-specific handler.
   */
  private registerEventListener(): void {
    if (this.listenerRegistered) return;
    this.listenerRegistered = true;

    this.events.subscribe((type, payload) => {
      if (type === 'authority:idea-injected') {
        const idea = payload as IdeaInjectedPayload;
        if (this.initializedProjects.has(idea.projectPath)) {
          this.handleIdeaInjected(idea);
        }
      }
    });
  }

  /**
   * Initialize the PM agent for a project.
   * Registers as an authority agent and starts listening for ideas.
   * Safe to call multiple times - subsequent calls are no-ops.
   */
  async initialize(projectPath: string): Promise<void> {
    if (this.initializedProjects.has(projectPath)) {
      return;
    }

    // Register as PM authority agent for this project
    const agent = await this.authorityService.registerAgent('product-manager', projectPath);
    this.agents.set(projectPath, agent);
    this.initializedProjects.add(projectPath);
    logger.info(`PM agent registered for project: ${agent.id}`);

    // Scan for any existing unprocessed ideas
    await this.scanForUnprocessedIdeas(projectPath);
  }

  /**
   * Handle a newly injected idea.
   * Debounces processing to avoid rapid-fire API calls.
   */
  private handleIdeaInjected(idea: IdeaInjectedPayload): void {
    if (this.processing.has(idea.featureId)) {
      logger.debug(`Already processing idea ${idea.featureId}, skipping`);
      return;
    }

    logger.info(`New idea received: "${idea.title}" (${idea.featureId})`);

    // Delay slightly to allow for any rapid-fire injections
    setTimeout(() => {
      void this.processIdea(idea.projectPath, idea.featureId);
    }, IDEA_PROCESSING_DELAY_MS);
  }

  /**
   * Scan for features with workItemState='idea' that haven't been processed yet.
   * Useful on startup to pick up any ideas that were injected while the agent was offline.
   */
  private async scanForUnprocessedIdeas(projectPath: string): Promise<void> {
    try {
      const features = await this.featureLoader.getAll(projectPath);
      const unprocessedIdeas = features.filter((f) => f.workItemState === 'idea');

      if (unprocessedIdeas.length > 0) {
        logger.info(`Found ${unprocessedIdeas.length} unprocessed ideas on startup`);
        for (const idea of unprocessedIdeas) {
          void this.processIdea(projectPath, idea.id);
        }
      }
    } catch (error) {
      logger.error('Failed to scan for unprocessed ideas:', error);
    }
  }

  /**
   * Process an idea through the PM pipeline:
   * 1. Transition idea → research (submit proposal)
   * 2. Analyze the idea and generate structured requirements
   * 3. Update the feature with analysis results
   * 4. Transition research → planned (submit proposal)
   * 5. Optionally create an epic if the idea is large
   */
  private async processIdea(projectPath: string, featureId: string): Promise<void> {
    if (this.processing.has(featureId)) return;
    this.processing.add(featureId);

    try {
      const agent = this.agents.get(projectPath);
      if (!agent) {
        logger.error(`PM agent not initialized for project: ${projectPath}`);
        return;
      }

      const feature = await this.featureLoader.get(projectPath, featureId);
      if (!feature) {
        logger.warn(`Feature ${featureId} not found, skipping`);
        return;
      }

      if (feature.workItemState !== 'idea') {
        logger.debug(
          `Feature ${featureId} is not in 'idea' state (${feature.workItemState}), skipping`
        );
        return;
      }

      logger.info(`Processing idea: "${feature.title}" (${featureId})`);

      // Step 1: Propose transition idea → research
      const researchDecision = await this.authorityService.submitProposal(
        {
          who: agent.id,
          what: 'transition_status',
          target: featureId,
          justification: `PM agent beginning research on idea: "${feature.title}"`,
          risk: 'low',
          statusTransition: { from: 'idea', to: 'research' },
        },
        projectPath
      );

      if (researchDecision.verdict === 'deny') {
        logger.warn(`Research transition denied for ${featureId}: ${researchDecision.reason}`);
        return;
      }

      if (researchDecision.verdict === 'require_approval') {
        logger.info(`Research transition requires approval for ${featureId}`);
        // Don't block - approval will be resolved async by CTO
        return;
      }

      // Transition approved - update workItemState
      await this.featureLoader.update(projectPath, featureId, {
        workItemState: 'research',
      });

      this.events.emit('authority:pm-research-started', {
        projectPath,
        featureId,
        agentId: agent.id,
      });

      // Step 2: Analyze the idea and generate structured requirements
      const analysis = this.analyzeIdea(feature);

      // Step 3: Update feature with analysis
      await this.featureLoader.update(
        projectPath,
        featureId,
        {
          description: analysis.enhancedDescription,
          workItemState: 'research', // Still researching
        },
        'enhance',
        'technical'
      );

      this.events.emit('authority:pm-research-completed', {
        projectPath,
        featureId,
        agentId: agent.id,
        analysis: {
          complexity: analysis.suggestedComplexity,
          componentCount: analysis.components.length,
        },
      });

      // Step 4: Propose transition research → planned
      const plannedDecision = await this.authorityService.submitProposal(
        {
          who: agent.id,
          what: 'transition_status',
          target: featureId,
          justification: `Research complete. ${analysis.components.length} components identified. Ready for planning.`,
          risk: 'low',
          statusTransition: { from: 'research', to: 'planned' },
        },
        projectPath
      );

      if (plannedDecision.verdict === 'deny') {
        logger.warn(`Planned transition denied for ${featureId}: ${plannedDecision.reason}`);
        return;
      }

      if (plannedDecision.verdict === 'require_approval') {
        logger.info(`Planned transition requires approval for ${featureId}`);
        return;
      }

      // Transition approved - mark as planned
      await this.featureLoader.update(projectPath, featureId, {
        workItemState: 'planned',
        complexity: analysis.suggestedComplexity,
      });

      // Step 5: If multiple components detected, create an epic
      if (analysis.components.length > 1) {
        await this.createEpicWithChildren(projectPath, feature, analysis);
      }

      logger.info(
        `Idea "${feature.title}" processed → planned (${analysis.components.length} components)`
      );
    } catch (error) {
      logger.error(`Failed to process idea ${featureId}:`, error);
    } finally {
      this.processing.delete(featureId);
    }
  }

  /**
   * Analyze an idea and produce structured requirements.
   * Currently uses heuristic analysis. Future: will spawn Claude for deep research.
   */
  private analyzeIdea(feature: Feature): IdeaAnalysis {
    const title = feature.title || 'Untitled';
    const description = feature.description || '';

    // Heuristic component detection based on keywords
    const components = this.detectComponents(title, description);
    const suggestedComplexity = this.estimateComplexity(description, components.length);

    // Build enhanced description with structured requirements
    const enhancedDescription = this.buildEnhancedDescription(
      title,
      description,
      components,
      suggestedComplexity
    );

    return {
      components,
      suggestedComplexity,
      enhancedDescription,
    };
  }

  /**
   * Detect logical components in an idea based on description content.
   * Returns a list of component names/descriptions.
   */
  private detectComponents(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const components: string[] = [];

    // Look for explicit list items (numbered or bulleted)
    const listItems = description.match(/^[\s]*[-*•]\s+.+$/gm);
    if (listItems && listItems.length > 1) {
      return listItems.map((item) => item.replace(/^[\s]*[-*•]\s+/, '').trim());
    }

    // Look for numbered items
    const numberedItems = description.match(/^\s*\d+[.)]\s+.+$/gm);
    if (numberedItems && numberedItems.length > 1) {
      return numberedItems.map((item) => item.replace(/^\s*\d+[.)]\s+/, '').trim());
    }

    // Keyword-based component detection
    const componentPatterns = [
      { pattern: /\b(api|endpoint|route)\b/i, name: 'API Layer' },
      { pattern: /\b(ui|frontend|component|page|view)\b/i, name: 'UI Components' },
      { pattern: /\b(database|schema|migration|model)\b/i, name: 'Data Layer' },
      { pattern: /\b(test|spec|e2e|unit)\b/i, name: 'Tests' },
      { pattern: /\b(auth|login|permission|role)\b/i, name: 'Authentication' },
      { pattern: /\b(webhook|notification|event)\b/i, name: 'Event System' },
      { pattern: /\b(config|setting|option)\b/i, name: 'Configuration' },
      { pattern: /\b(doc|readme|guide)\b/i, name: 'Documentation' },
    ];

    for (const { pattern, name } of componentPatterns) {
      if (pattern.test(text)) {
        components.push(name);
      }
    }

    // If no components detected, treat as a single unit
    if (components.length === 0) {
      components.push(title);
    }

    return components;
  }

  /**
   * Estimate complexity based on description length and component count.
   */
  private estimateComplexity(
    description: string,
    componentCount: number
  ): 'small' | 'medium' | 'large' | 'architectural' {
    const wordCount = description.split(/\s+/).length;

    if (componentCount >= 4 || wordCount > 500) return 'architectural';
    if (componentCount >= 3 || wordCount > 200) return 'large';
    if (componentCount >= 2 || wordCount > 50) return 'medium';
    return 'small';
  }

  /**
   * Build an enhanced description with structured requirements format.
   */
  private buildEnhancedDescription(
    title: string,
    originalDescription: string,
    components: string[],
    complexity: string
  ): string {
    const sections: string[] = [];

    sections.push(`## ${title}\n`);
    sections.push(`**Original Idea:**\n${originalDescription}\n`);
    sections.push(`**Complexity:** ${complexity}`);
    sections.push(`**Components:** ${components.length}\n`);

    if (components.length > 1) {
      sections.push('**Breakdown:**');
      for (const component of components) {
        sections.push(`- ${component}`);
      }
      sections.push('');
    }

    sections.push('**Status:** Analyzed by PM agent. Ready for project manager decomposition.');

    return sections.join('\n');
  }

  /**
   * Create an epic from the analyzed idea and generate child features for each component.
   */
  private async createEpicWithChildren(
    projectPath: string,
    originalFeature: Feature,
    analysis: IdeaAnalysis
  ): Promise<void> {
    const agent = this.agents.get(projectPath);
    if (!agent) return;

    // Submit proposal to create epic
    const epicDecision = await this.authorityService.submitProposal(
      {
        who: agent.id,
        what: 'create_work',
        target: originalFeature.id,
        justification: `Creating epic for "${originalFeature.title}" with ${analysis.components.length} child features`,
        risk: 'low',
      },
      projectPath
    );

    if (epicDecision.verdict === 'deny') {
      logger.warn(`Epic creation denied: ${epicDecision.reason}`);
      return;
    }

    if (epicDecision.verdict === 'require_approval') {
      logger.info('Epic creation requires approval');
      return;
    }

    // Mark the original feature as an epic
    await this.featureLoader.update(projectPath, originalFeature.id, {
      isEpic: true,
      epicColor: '#6366f1', // Indigo for PM-created epics
    });

    // Create child features for each component
    for (const component of analysis.components) {
      const childFeature = await this.featureLoader.create(projectPath, {
        title: component,
        description: `Component of "${originalFeature.title}": ${component}`,
        status: 'backlog',
        category: 'Authority Ideas',
        epicId: originalFeature.id,
        workItemState: 'planned',
        complexity: analysis.suggestedComplexity === 'architectural' ? 'large' : 'medium',
      });

      logger.info(`Created child feature: "${component}" (${childFeature.id})`);
    }

    this.events.emit('authority:pm-epic-created', {
      projectPath,
      epicId: originalFeature.id,
      title: originalFeature.title,
      childCount: analysis.components.length,
      agentId: agent.id,
    });

    logger.info(
      `Epic created: "${originalFeature.title}" with ${analysis.components.length} children`
    );
  }

  /**
   * Get the registered agent for a project.
   */
  getAgent(projectPath: string): AuthorityAgent | null {
    return this.agents.get(projectPath) ?? null;
  }
}

/**
 * Internal type for idea analysis results.
 */
interface IdeaAnalysis {
  components: string[];
  suggestedComplexity: 'small' | 'medium' | 'large' | 'architectural';
  enhancedDescription: string;
}
