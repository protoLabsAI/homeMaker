# Authority System - Sprint Progress

## Current Status: Sprint 4 Complete, Sprint 5 Next

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

| Feature                        | Status | Commit |
| ------------------------------ | ------ | ------ |
| CTO Tools & Approval Interface | Done   | TBD    |
| PM Authority Agent             | Done   | TBD    |
| Inject Idea Endpoint           | Done   | TBD    |

**Key Reframe:** CTO = the human user, NOT an AI agent. The CTO tools are the interface for the human to interact with the authority system.

**Deliverables:**

- `workItemState?: WorkItemState` field added to Feature interface
- `POST /api/authority/inject-idea` - CTO submits ideas that create features with `workItemState='idea'`
- `POST /api/authority/dashboard` - CTO overview of agents, approvals, and ideas in pipeline
- `apps/server/src/services/authority-agents/pm-agent.ts` - First AI executive agent
- PM agent: listens for ideas, transitions idea → research → planned, creates epics for multi-component ideas
- New events: `authority:idea-injected`, `authority:pm-research-started`, `authority:pm-research-completed`, `authority:pm-epic-created`
- PM agent initialized lazily per-project when first idea is injected

### Sprint 5: ProjM Agent + EM Agent - PLANNED

| Feature               | Status  | Board ID                          |
| --------------------- | ------- | --------------------------------- |
| ProjM Authority Agent | Backlog | `feature-1770331878368-t4t7kf9xq` |
| EM Authority Agent    | Backlog | `feature-1770331881437-7k5x6b82k` |

### Sprint 6: Status Monitoring + Escalation - PLANNED

| Feature                  | Status  | Board ID                          |
| ------------------------ | ------- | --------------------------------- |
| Status & Blocker Monitor | Backlog | `feature-1770331884523-mxwhnfwcs` |
| Discord Approval Routing | Backlog | `feature-1770331887568-4v1fwqbp6` |

### Sprint 7: Audit Trail + Trust Evolution - PLANNED

| Feature               | Status  | Board ID                          |
| --------------------- | ------- | --------------------------------- |
| Audit Trail Service   | Backlog | `feature-1770331890693-u19wvjwkf` |
| Trust Evolution Logic | Backlog | `feature-1770331893763-lhx2h1d1f` |

## Key Decisions

1. **Two-layer type system**: Engine types (short codes, fast checks) + Authority types (full names, organizational context). Bridged via mapping constants.
2. **Backward compatible**: Gated behind `authoritySystem.enabled` in ProjectSettings. When off, everything works as today.
3. **Worktree agent limitation**: Feature agents branch from stale commits, causing type divergence. Clean-code-architect subagents working on main are more effective for foundational work.
4. **Walking skeleton target**: Sprint 6 milestone - full loop from CTO idea injection to auto-mode execution with blocker detection and escalation.
