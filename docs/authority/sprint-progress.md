# Authority System - Sprint Progress

## Current Status: All Sprints Complete + EM Dev Lifecycle

### Sprint 1: Policy Engine Types + Core Check Function - DONE

| Feature                         | Status | Commit     |
| ------------------------------- | ------ | ---------- |
| Policy & Trust Type Definitions | Done   | `09798599` |
| Policy Engine Core              | Done   | `6efe5d78` |
| Policy Engine Tests             | Done   | `774a01de` |

**Deliverables:**

- `libs/types/src/policy.ts` - Two-layer type system (engine + authority)
- `libs/types/src/authority.ts` - Agent and work item types
- `libs/policy-engine/` - New package with `checkPolicy()`, defaults, 37 tests
- Permission matrix: CTO (all), PM (create/scope), ProjM (create/assign), EM (assign/block), PE (arch/approve/block)
- Status transition guards with role-based access

### Sprint 2: Authority Service + API Routes + Events - DONE

| Feature                     | Status | Commit     |
| --------------------------- | ------ | ---------- |
| Authority Service Core      | Done   | `2f6d58d0` |
| Authority API Routes        | Done   | `2f6d58d0` |
| Authority Events & Settings | Done   | `2f6d58d0` |

**Deliverables:**

- `apps/server/src/services/authority-service.ts` - Agent registry, proposal processing, approval queue
- `apps/server/src/routes/authority/index.ts` - 7 REST endpoints
- Authority events in `libs/types/src/event.ts`
- `authoritySystem` config in `ProjectSettings`
- Type bridging between authority and engine layers
- Persistence to `.automaker/authority/` JSON files

### Sprint 3: Policy-Gated Feature Mutations - DONE

| Feature                      | Status | Commit     |
| ---------------------------- | ------ | ---------- |
| Policy-Gated FeatureLoader   | Done   | `1613cade` |
| Auto-Mode Policy Integration | Done   | `1613cade` |

**Deliverables:**

- Policy-gated feature update route in `apps/server/src/routes/features/routes/update.ts`
- Auto-mode policy integration in `apps/server/src/services/auto-mode-service.ts`
- Fail-open pattern: authority errors logged but don't block
- 403 on deny, 202 on require_approval, pass-through on allow

### Sprint 4: CTO Tools + PM Agent - DONE

| Feature                        | Status | Commit     |
| ------------------------------ | ------ | ---------- |
| CTO Tools & Approval Interface | Done   | `aa30bec4` |
| PM Authority Agent             | Done   | `aa30bec4` |
| Inject Idea Endpoint           | Done   | `aa30bec4` |

**Key Reframe:** CTO = the human user, NOT an AI agent. The CTO tools are the interface for the human to interact with the authority system.

**Deliverables:**

- `workItemState?: WorkItemState` field added to Feature interface
- `POST /api/authority/inject-idea` - CTO submits ideas that create features with `workItemState='idea'`
- `POST /api/authority/dashboard` - CTO overview of agents, approvals, and ideas in pipeline
- `apps/server/src/services/authority-agents/pm-agent.ts` - First AI executive agent
- PM agent: listens for ideas, transitions idea -> research -> planned, creates epics for multi-component ideas
- New events: `authority:idea-injected`, `authority:pm-research-started`, `authority:pm-research-completed`, `authority:pm-epic-created`
- PM agent initialized lazily per-project when first idea is injected

### Sprint 5: ProjM Agent + EM Agent - DONE

| Feature               | Status | Commit     |
| --------------------- | ------ | ---------- |
| ProjM Authority Agent | Done   | `aa30bec4` |
| EM Authority Agent    | Done   | `aa30bec4` |

**Deliverables:**

- `apps/server/src/services/authority-agents/projm-agent.ts` - Decomposes epics into child features with dependencies
- `apps/server/src/services/authority-agents/em-agent.ts` - Assigns work, manages WIP limits, triggers auto-mode
- ProjM: monitors epics in 'planned' state, sets up dependency chains, transitions planned -> ready
- EM: monitors features in 'ready' state, assesses complexity, assigns roles, transitions ready -> in_progress
- All actions through `authorityService.submitProposal()`

### Sprint 6: Status Monitoring + Escalation - DONE

| Feature                  | Status | Commit     |
| ------------------------ | ------ | ---------- |
| Status & Blocker Monitor | Done   | `aa30bec4` |
| Discord Approval Routing | Done   | `aa30bec4` |

**Deliverables:**

- `apps/server/src/services/authority-agents/status-agent.ts` - Periodic scan (30s) for stale, failed, and deadlocked features
- `apps/server/src/services/authority-agents/discord-approval-router.ts` - Formatted approval requests with curl commands
- Blocker detection: failed features, stale features (>10min in_progress), dependency deadlocks
- Escalation via `authority:awaiting-approval` events
- Discord messages include approval ID and curl command for quick CTO action

### Sprint 7: Audit Trail + Trust Evolution - DONE

| Feature               | Status | Commit     |
| --------------------- | ------ | ---------- |
| Audit Trail Service   | Done   | `aa30bec4` |
| Trust Evolution Logic | Done   | `aa30bec4` |

**Deliverables:**

- `apps/server/src/services/audit-service.ts` - Append-only JSONL audit trail + query API
- `POST /api/authority/audit` - Query audit entries with filters (eventType, agentId, limit, since)
- `POST /api/authority/trust-scores` - View trust scores for agents
- Trust score tracking: +1 for success, -2 for escalation
- Auto-promotion thresholds: 20 for trust 1->2, 50 for trust 2->3
- CTO can manually set trust via API

### Post-Sprint: EM Dev Lifecycle - DONE

| Feature                  | Status | Commit     |
| ------------------------ | ------ | ---------- |
| PR Feedback Service      | Done   | `d2ff2c35` |
| Worktree Lifecycle       | Done   | `d2ff2c35` |
| EM Agent PR Handling     | Done   | `d2ff2c35` |
| GitHub Webhook Expansion | Done   | `d2ff2c35` |

**Deliverables:**

- `apps/server/src/services/pr-feedback-service.ts` - Polls GitHub for PR review status every 60s
  - Tracks PRs from `auto_mode_git_workflow` events
  - Detects: CHANGES_REQUESTED, APPROVED, COMMENTED
  - Parses CodeRabbit comments
  - Escalates to CTO after 3 iterations
- `apps/server/src/services/worktree-lifecycle-service.ts` - Auto-cleanup on merge/completion
  - Listens for `feature:pr-merged` and `feature:completed` events
  - Removes worktrees and local branches
  - Prevents stale worktree accumulation (was 35GB before cleanup)
- EM Agent enhanced with PR feedback handling:
  - Listens for `pr:changes-requested` events
  - Reassigns features to backlog with fix instructions appended to description
  - Submits assign_work proposal through authority for reassignment
  - Tracks reassignment to prevent double-processing
- GitHub webhook expanded to handle `pull_request_review` events
- New event types: `pr:feedback-received`, `pr:changes-requested`, `pr:approved`, `feature:reassigned-for-fixes`, `feature:worktree-cleaned`
- New feature fields: `prUrl`, `prNumber`, `prIterationCount`, `lastReviewFeedback`

---

## Complete Agent Flow

```
CTO types /idea in Discord
     |
     v
[Inject Idea] POST /api/authority/inject-idea
     |
     v
[PM Agent] Picks up idea (workItemState='idea')
     |  - Analyzes idea, detects components
     |  - Generates structured requirements
     |  - Transitions: idea -> research -> planned
     |  - Creates epic if multi-component
     v
[ProjM Agent] Picks up epic (workItemState='planned')
     |  - Decomposes epic into child features
     |  - Sets up dependencies between features
     |  - Transitions children: planned -> ready
     v
[EM Agent] Picks up features (workItemState='ready')
     |  - Assesses complexity (small/medium/large/architectural)
     |  - Checks WIP limits (default: 3 concurrent)
     |  - Submits assign_work + transition_status proposals
     |  - Transitions: ready -> in_progress
     v
[Auto-Mode] Executes features via Claude agents in worktrees
     |  - Creates git branch + worktree
     |  - Agent implements the feature
     |  - Creates PR targeting epic branch (or main)
     v
[PR Feedback Service] Monitors PR reviews (polls GitHub every 60s)
     |
     |-- CHANGES_REQUESTED:
     |     |  EM reassigns to backlog with fix instructions
     |     |  Agent picks up again, pushes fixes to same branch
     |     |  (max 3 iterations before CTO escalation)
     |     v
     |   [Loop back to Auto-Mode]
     |
     |-- APPROVED:
     |     v
     |   [Merge] -> feature:pr-merged event
     |
     v
[Worktree Lifecycle] Cleans up on merge/completion
     |  - Removes worktree directory
     |  - Deletes local branch
     |  - Emits feature:worktree-cleaned
     v
[Status Agent] Monitors for blockers (scans every 30s)
     |  - Detects: failed, stale (>10min), deadlocked features
     |  - Escalates via authority:awaiting-approval
     v
[Discord Approval Router] Posts approval requests
     |  - Formatted messages with risk level, justification
     |  - Includes curl commands for quick CTO approval
     v
[CTO] Approves/rejects via API or Discord
```

---

## Key Decisions

1. **Two-layer type system**: Engine types (short codes, fast checks) + Authority types (full names, organizational context). Bridged via mapping constants.
2. **Backward compatible**: Gated behind `authoritySystem.enabled` in ProjectSettings. When off, everything works as today.
3. **Fail-open pattern**: Authority/policy errors are logged but don't block operations. Prevents the authority system from becoming a single point of failure.
4. **PR feedback loop**: Max 3 iterations before escalating to CTO. Prevents infinite review cycles.
5. **Worktree lifecycle**: Auto-cleanup prevents disk accumulation. Previous session found 281 stale worktrees consuming 35GB.
6. **CTO = Human**: The CTO is the human user with trust=infinity. All other agents are AI with trust=1 (starting). Trust evolves based on performance.

## Service Files

| Service                    | File                                                                   | Purpose                              |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| Policy Engine              | `libs/policy-engine/src/engine.ts`                                     | Core `checkPolicy()` function        |
| Authority Service          | `apps/server/src/services/authority-service.ts`                        | Agent registry, proposals, approvals |
| PM Agent                   | `apps/server/src/services/authority-agents/pm-agent.ts`                | Idea research + PRD + epic creation  |
| ProjM Agent                | `apps/server/src/services/authority-agents/projm-agent.ts`             | Epic decomposition + dependencies    |
| EM Agent                   | `apps/server/src/services/authority-agents/em-agent.ts`                | Assignment + capacity + PR feedback  |
| Status Agent               | `apps/server/src/services/authority-agents/status-agent.ts`            | Blocker detection + escalation       |
| Discord Approval Router    | `apps/server/src/services/authority-agents/discord-approval-router.ts` | Approval notifications               |
| Audit Service              | `apps/server/src/services/audit-service.ts`                            | Append-only audit trail              |
| PR Feedback Service        | `apps/server/src/services/pr-feedback-service.ts`                      | GitHub PR review monitoring          |
| Worktree Lifecycle Service | `apps/server/src/services/worktree-lifecycle-service.ts`               | Auto-cleanup on merge/complete       |

## API Endpoints

| Endpoint                           | Purpose                  |
| ---------------------------------- | ------------------------ |
| `POST /api/authority/register`     | Register authority agent |
| `POST /api/authority/propose`      | Submit action proposal   |
| `POST /api/authority/resolve`      | Approve/reject/modify    |
| `POST /api/authority/approvals`    | List pending approvals   |
| `POST /api/authority/agents`       | List authority agents    |
| `POST /api/authority/trust`        | Set trust level          |
| `POST /api/authority/inject-idea`  | CTO submits idea         |
| `POST /api/authority/dashboard`    | CTO system overview      |
| `POST /api/authority/audit`        | Query audit trail        |
| `POST /api/authority/trust-scores` | View trust scores        |
