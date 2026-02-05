/**
 * Linear Monitor Service
 *
 * Monitors Linear projects for new work items for headsdown agents.
 * Used by Engineering Manager agents to detect approved projects needing breakdown.
 */

import type { EventEmitter } from '../lib/events.js';
import type { LinearMonitorConfig, WorkItem } from '@automaker/types';
import { createLogger } from '@automaker/utils';

const logger = createLogger('LinearMonitor');

/**
 * Linear project with metadata
 */
export interface LinearProjectItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

/**
 * Linear issue with metadata
 */
export interface LinearIssueItem {
  id: string;
  identifier: string; // e.g., "ENG-123"
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  projectId?: string;
  labels: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

/**
 * LinearMonitor - Polls Linear for new projects and issues
 *
 * Used by headsdown agents (especially Engineering Manager) to detect:
 * - New projects needing feature breakdown
 * - Assigned issues for engineers to implement
 * - Status updates on ongoing work
 */
export class LinearMonitor {
  /** Last project update timestamp per project */
  private lastUpdateTimes = new Map<string, string>();

  /** Active polling intervals */
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor(private events: EventEmitter) {}

  /**
   * Start monitoring Linear projects
   */
  async startMonitoring(config: LinearMonitorConfig): Promise<void> {
    const { projectIds, labels = [], pollInterval = 30000 } = config;

    // Start polling loop for projects
    const interval = setInterval(async () => {
      try {
        await this.pollProjects(projectIds, labels);
      } catch (error) {
        logger.error(`Error polling Linear projects:`, error);
      }
    }, pollInterval);

    this.intervals.set('projects', interval);
    logger.info(`Started monitoring ${projectIds.length} Linear projects`);
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    for (const [key, interval] of this.intervals.entries()) {
      clearInterval(interval);
      logger.info(`Stopped monitoring: ${key}`);
    }
    this.intervals.clear();
    this.lastUpdateTimes.clear();
  }

  /**
   * Poll projects for updates
   */
  private async pollProjects(projectIds: string[], labels: string[]): Promise<void> {
    for (const projectId of projectIds) {
      const project = await this.fetchProject(projectId);

      if (!project) {
        continue;
      }

      // Check if project was updated since last check
      const lastUpdate = this.lastUpdateTimes.get(projectId);

      if (!lastUpdate || new Date(project.updatedAt) > new Date(lastUpdate)) {
        // Project was updated - check if it needs processing
        this.lastUpdateTimes.set(projectId, project.updatedAt);

        // Emit event for EM agent to process
        this.events.emit('linear:project:updated', {
          project,
        });

        logger.info(`Detected update to Linear project: ${project.name}`);
      }

      // Also check for new issues in this project
      await this.pollIssues(projectId, labels);
    }
  }

  /**
   * Poll issues for a project
   */
  private async pollIssues(projectId: string, labels: string[]): Promise<void> {
    const issues = await this.fetchIssues(projectId, labels);

    for (const issue of issues) {
      // Emit event for engineer agents monitoring their role labels
      this.events.emit('linear:issue:detected', {
        issue,
        projectId,
      });
    }
  }

  /**
   * Fetch project details from Linear
   *
   * This is a placeholder - actual implementation would use Linear MCP tools
   * or Linear API client.
   */
  private async fetchProject(projectId: string): Promise<LinearProjectItem | null> {
    // TODO: Implement actual Linear project fetching
    // Options:
    // 1. Use Linear MCP tools (mcp__linear__linear_getProjects)
    // 2. Use Linear SDK
    // 3. Use Linear GraphQL API directly

    // For now, return null (will be implemented when Linear integration is configured)
    return null;
  }

  /**
   * Fetch issues for a project
   *
   * This is a placeholder - actual implementation would use Linear MCP tools.
   */
  private async fetchIssues(projectId: string, labels: string[]): Promise<LinearIssueItem[]> {
    // TODO: Implement actual Linear issue fetching
    // Use mcp__linear__linear_searchIssues or mcp__linear__linear_getProjectIssues

    // For now, return empty array
    return [];
  }

  /**
   * Convert Linear project to WorkItem for headsdown agents
   */
  static projectToWorkItem(project: LinearProjectItem): WorkItem {
    return {
      type: 'linear_issue', // Reuse this type for projects too
      id: project.id,
      priority: 2, // Medium priority - orchestration work
      description: `Linear project needs breakdown: "${project.name}"`,
      url: project.url,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        teamId: project.teamId,
        status: project.status,
      },
    };
  }

  /**
   * Convert Linear issue to WorkItem for headsdown agents
   */
  static issueToWorkItem(issue: LinearIssueItem): WorkItem {
    return {
      type: 'linear_issue',
      id: issue.id,
      priority: issue.priority || 3,
      description: `Linear issue: ${issue.identifier} - ${issue.title}`,
      url: issue.url,
      metadata: {
        issueId: issue.id,
        identifier: issue.identifier,
        projectId: issue.projectId,
        assigneeId: issue.assigneeId,
        labels: issue.labels,
        status: issue.status,
      },
    };
  }

  /**
   * Get all monitored projects
   */
  getMonitoredProjects(): string[] {
    return Array.from(this.lastUpdateTimes.keys());
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.intervals.size > 0;
  }
}
