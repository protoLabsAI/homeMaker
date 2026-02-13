/**
 * Ava Crew Member - Board health, stale features, PR pipeline, dependency chain
 *
 * Lightweight check (every 10 min):
 *   - Board health audit (dry-run, no auto-fix)
 *   - Stuck agents (running > 2h)
 *   - Stale PRs in review (> 24h)
 *   - Blocked feature count
 *   - Dependency chain issues
 *
 * Escalates when: warnings found (stuck agents, many blocked features, stale PRs)
 */

import type {
  CrewMemberDefinition,
  CrewCheckContext,
  CrewCheckResult,
} from '../crew-loop-service.js';

const STUCK_AGENT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const STALE_PR_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const avaCrewMember: CrewMemberDefinition = {
  id: 'ava',
  displayName: 'Ava (Chief of Staff)',
  templateName: 'ava',
  defaultSchedule: '*/10 * * * *',
  enabledByDefault: true,

  async check(ctx: CrewCheckContext): Promise<CrewCheckResult> {
    type Severity = CrewCheckResult['severity'];
    const findings: CrewCheckResult['findings'] = [];
    const metrics: Record<string, unknown> = {};

    // Use a severity rank to track the worst finding without TS narrowing issues
    const SEVERITY_RANK: Record<Severity, number> = { ok: 0, info: 1, warning: 2, critical: 3 };
    let maxRank = 0;

    function raise(severity: Severity) {
      const rank = SEVERITY_RANK[severity];
      if (rank > maxRank) maxRank = rank;
    }

    // 1. Check for stuck agents (running > 2h)
    try {
      const runningAgents = await ctx.autoModeService.getRunningAgents();
      const now = Date.now();
      let stuckCount = 0;

      for (const agent of runningAgents) {
        const runningMs = now - agent.startTime;
        if (runningMs > STUCK_AGENT_THRESHOLD_MS) {
          stuckCount++;
          const runningMin = Math.round(runningMs / 60_000);
          findings.push({
            type: 'stuck-agent',
            message: `Agent for feature ${agent.featureId} has been running for ${runningMin} minutes`,
            severity: 'warning',
            context: { featureId: agent.featureId, runningMs, projectPath: agent.projectPath },
          });
        }
      }

      metrics.runningAgents = runningAgents.length;
      metrics.stuckAgents = stuckCount;
      if (stuckCount > 0) raise('warning');
    } catch (error) {
      findings.push({
        type: 'check-error',
        message: `Failed to check running agents: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'info',
      });
    }

    // 2. Check for stale PRs in review (> 24h)
    try {
      for (const projectPath of ctx.projectPaths) {
        const allFeatures = await ctx.featureLoader.getAll(projectPath);
        const reviewFeatures = allFeatures.filter((f) => f.status === 'review');
        let stalePRCount = 0;

        for (const feature of reviewFeatures) {
          const reviewTimestamp = feature.reviewStartedAt ?? feature.completedAt;
          if (reviewTimestamp) {
            const reviewAge = Date.now() - new Date(reviewTimestamp).getTime();
            if (reviewAge > STALE_PR_THRESHOLD_MS) {
              stalePRCount++;
              const hoursInReview = Math.round(reviewAge / (60 * 60 * 1000));
              findings.push({
                type: 'stale-pr',
                message: `PR for "${feature.title}" has been in review for ${hoursInReview}h`,
                severity: 'info',
                context: { featureId: feature.id, prNumber: feature.prNumber, hoursInReview },
              });
            }
          }
        }

        // 3. Count blocked features
        const blockedFeatures = allFeatures.filter((f) => f.status === 'blocked');
        if (blockedFeatures.length >= 3) {
          findings.push({
            type: 'many-blocked',
            message: `${blockedFeatures.length} features are blocked in ${projectPath}`,
            severity: 'warning',
            context: { count: blockedFeatures.length, projectPath },
          });
          raise('warning');
        }

        metrics.reviewFeatures = ((metrics.reviewFeatures as number) || 0) + reviewFeatures.length;
        metrics.stalePRs = ((metrics.stalePRs as number) || 0) + stalePRCount;
        metrics.blockedFeatures =
          ((metrics.blockedFeatures as number) || 0) + blockedFeatures.length;
      }
    } catch (error) {
      findings.push({
        type: 'check-error',
        message: `Failed to check features: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'info',
      });
    }

    // 4. Board health audit (dry-run)
    try {
      for (const projectPath of ctx.projectPaths) {
        const report = await ctx.featureHealthService.audit(projectPath, false);
        if (report.issues.length > 0) {
          const hasOrphanedEpic = report.issues.some((i) => i.type === 'orphaned_epic_ref');
          findings.push({
            type: 'board-health',
            message: `${report.issues.length} board health issue(s) in ${projectPath}`,
            severity: hasOrphanedEpic ? 'warning' : 'info',
            context: { issueCount: report.issues.length, issues: report.issues.slice(0, 5) },
          });
          raise(hasOrphanedEpic ? 'warning' : 'info');
        }
      }
    } catch (error) {
      findings.push({
        type: 'check-error',
        message: `Board health audit failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'info',
      });
    }

    const RANK_TO_SEVERITY: Severity[] = ['ok', 'info', 'warning', 'critical'];
    const maxSeverity = RANK_TO_SEVERITY[maxRank] ?? 'ok';
    const needsEscalation = maxRank >= SEVERITY_RANK.warning;

    const summary =
      findings.length === 0
        ? 'All systems nominal'
        : `${findings.length} finding(s): ${findings.filter((f) => f.severity === 'warning' || f.severity === 'critical').length} actionable`;

    return {
      needsEscalation,
      summary,
      severity: maxSeverity,
      findings,
      metrics,
    };
  },

  buildEscalationPrompt(result: CrewCheckResult): string {
    const findingsList = result.findings
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.type}: ${f.message}`)
      .join('\n');

    return `Automated crew loop check detected issues requiring attention.

**Severity:** ${result.severity}
**Summary:** ${result.summary}

**Findings:**
${findingsList}

**Metrics:** ${JSON.stringify(result.metrics, null, 2)}

Please:
1. Analyze the findings and determine which require immediate action
2. For stuck agents: check if they need to be stopped or are making progress
3. For stale PRs: check PR status and unblock if possible
4. For blocked features: identify the root cause of the blockage
5. Post a summary of your actions to Discord #infra if any remediation was taken`;
  },

  escalationTools: [
    'Read',
    'Glob',
    'Grep',
    'Bash',
    'mcp__plugin_automaker_automaker__list_features',
    'mcp__plugin_automaker_automaker__get_feature',
    'mcp__plugin_automaker_automaker__update_feature',
    'mcp__plugin_automaker_automaker__list_running_agents',
    'mcp__plugin_automaker_automaker__stop_agent',
    'mcp__plugin_automaker_automaker__check_pr_status',
    'mcp__plugin_automaker_automaker__get_board_summary',
    'mcp__plugin_automaker_discord__discord_send',
  ],
};
