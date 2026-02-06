/**
 * ProjM Authority Agent - Project Manager AI Agent
 *
 * Responsible for the "when & how" of feature execution:
 * - Monitors epics/features in 'planned' state (created by PM agent)
 * - Decomposes large features into implementable child tasks
 * - Sets up dependencies between tasks
 * - Transitions features: planned → ready
 *
 * All actions go through AuthorityService.submitProposal().
 */

import type { Feature } from '@automaker/types';
import type { AuthorityAgent } from '@automaker/types';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../lib/events.js';
import type { AuthorityService } from '../authority-service.js';
import type { FeatureLoader } from '../feature-loader.js';

const logger = createLogger('ProjMAgent');

/** Polling interval for checking planned features */
const POLL_INTERVAL_MS = 10_000;

export class ProjMAuthorityAgent {
  private readonly events: EventEmitter;
  private readonly authorityService: AuthorityService;
  private readonly featureLoader: FeatureLoader;

  private agents = new Map<string, AuthorityAgent>();
  private initializedProjects = new Set<string>();
  private processing = new Set<string>();
  private pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    events: EventEmitter,
    authorityService: AuthorityService,
    featureLoader: FeatureLoader
  ) {
    this.events = events;
    this.authorityService = authorityService;
    this.featureLoader = featureLoader;

    // Listen for PM completing research (features moving to 'planned')
    this.events.subscribe((type, payload) => {
      if (type === 'authority:pm-research-completed' || type === 'authority:pm-epic-created') {
        const data = payload as { projectPath: string; featureId?: string; epicId?: string };
        if (this.initializedProjects.has(data.projectPath)) {
          void this.scanForPlannedFeatures(data.projectPath);
        }
      }
    });
  }

  /**
   * Initialize the ProjM agent for a project.
   * Registers as authority agent and starts polling for planned features.
   */
  async initialize(projectPath: string): Promise<void> {
    if (this.initializedProjects.has(projectPath)) return;

    const agent = await this.authorityService.registerAgent('project-manager', projectPath);
    this.agents.set(projectPath, agent);
    this.initializedProjects.add(projectPath);
    logger.info(`ProjM agent registered for project: ${agent.id}`);

    // Scan for existing planned features
    await this.scanForPlannedFeatures(projectPath);

    // Start periodic polling
    const timer = setInterval(() => {
      void this.scanForPlannedFeatures(projectPath);
    }, POLL_INTERVAL_MS);
    this.pollTimers.set(projectPath, timer);
  }

  /**
   * Stop the ProjM agent for a project.
   */
  stop(projectPath: string): void {
    const timer = this.pollTimers.get(projectPath);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(projectPath);
    }
    this.initializedProjects.delete(projectPath);
    logger.info(`ProjM agent stopped for project: ${projectPath}`);
  }

  /**
   * Scan for features in 'planned' state and process them.
   */
  private async scanForPlannedFeatures(projectPath: string): Promise<void> {
    try {
      const features = await this.featureLoader.getAll(projectPath);
      const planned = features.filter(
        (f) => f.workItemState === 'planned' && !this.processing.has(f.id)
      );

      for (const feature of planned) {
        void this.processPlannedFeature(projectPath, feature);
      }
    } catch (error) {
      logger.error('Failed to scan for planned features:', error);
    }
  }

  /**
   * Process a planned feature:
   * 1. If it's an epic with children already created by PM, set up dependencies
   * 2. If it's a standalone feature, check if it needs decomposition
   * 3. Transition to 'ready' state
   */
  private async processPlannedFeature(projectPath: string, feature: Feature): Promise<void> {
    if (this.processing.has(feature.id)) return;
    this.processing.add(feature.id);

    try {
      const agent = this.agents.get(projectPath);
      if (!agent) return;

      logger.info(`Processing planned feature: "${feature.title}" (${feature.id})`);

      if (feature.isEpic) {
        // Epic: set up dependencies between child features
        await this.setupEpicDependencies(projectPath, feature, agent);
      }

      // Propose transition planned → ready
      const decision = await this.authorityService.submitProposal(
        {
          who: agent.id,
          what: 'transition_status',
          target: feature.id,
          justification: `Feature "${feature.title}" is ready for assignment.${feature.isEpic ? ` Epic with child features, dependencies configured.` : ''}`,
          risk: 'low',
          statusTransition: { from: 'planned', to: 'ready' },
        },
        projectPath
      );

      if (decision.verdict === 'deny') {
        logger.warn(`Ready transition denied for ${feature.id}: ${decision.reason}`);
        return;
      }

      if (decision.verdict === 'require_approval') {
        logger.info(`Ready transition requires approval for ${feature.id}`);
        return;
      }

      // Transition approved
      await this.featureLoader.update(projectPath, feature.id, {
        workItemState: 'ready',
      });

      logger.info(`Feature "${feature.title}" transitioned to ready`);
    } catch (error) {
      logger.error(`Failed to process planned feature ${feature.id}:`, error);
    } finally {
      this.processing.delete(feature.id);
    }
  }

  /**
   * Set up dependencies between child features of an epic.
   * Simple heuristic: children are ordered by creation time and each depends on the previous.
   */
  private async setupEpicDependencies(
    projectPath: string,
    epic: Feature,
    agent: AuthorityAgent
  ): Promise<void> {
    const allFeatures = await this.featureLoader.getAll(projectPath);
    const children = allFeatures
      .filter((f) => f.epicId === epic.id && f.id !== epic.id)
      .sort((a, b) => (a.id > b.id ? 1 : -1)); // Sort by ID (creation order)

    if (children.length < 2) return;

    // Submit proposal for dependency setup
    const decision = await this.authorityService.submitProposal(
      {
        who: agent.id,
        what: 'create_work',
        target: epic.id,
        justification: `Setting up sequential dependencies for ${children.length} child features of epic "${epic.title}"`,
        risk: 'low',
      },
      projectPath
    );

    if (decision.verdict !== 'allow') {
      logger.warn(`Dependency setup not allowed for epic ${epic.id}: ${decision.reason}`);
      return;
    }

    // Chain dependencies: each feature depends on the previous
    for (let i = 1; i < children.length; i++) {
      const current = children[i];
      const previous = children[i - 1];

      const existingDeps = current.dependencies || [];
      if (!existingDeps.includes(previous.id)) {
        await this.featureLoader.update(projectPath, current.id, {
          dependencies: [...existingDeps, previous.id],
        });
      }
    }

    // Also transition all children to 'ready'
    for (const child of children) {
      if (child.workItemState === 'planned') {
        await this.featureLoader.update(projectPath, child.id, {
          workItemState: 'ready',
        });
      }
    }

    logger.info(
      `Dependencies set up for epic "${epic.title}": ${children.length} children chained`
    );
  }

  getAgent(projectPath: string): AuthorityAgent | null {
    return this.agents.get(projectPath) ?? null;
  }
}
