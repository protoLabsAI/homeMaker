# Phase 3: Add auto-failover timer to ProjectAssignmentService

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add a periodic check (every 60s) in ProjectAssignmentService that reads peer heartbeats, detects orphaned projects (assignedTo instance stale >120s), and auto-claims them. When original instance comes back, it does NOT auto-reclaim — Ava or operator must explicitly reassign. Emit event when failover occurs for observability.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/project-assignment-service.ts`

### Verification
- [ ] Periodic check runs every 60 seconds
- [ ] Detects orphaned projects via peer heartbeat staleness (>120s threshold)
- [ ] Auto-claims orphans with assignedBy: 'auto-failover'
- [ ] Recovered instances do NOT auto-reclaim their old projects
- [ ] Event emitted on failover for logging/observability
- [ ] Unit test covers failover detection and claim

---

## Deliverables

- [ ] Code implemented and working
- [ ] Tests passing
- [ ] Documentation updated

---

## Handoff Checklist

Before marking Phase 3 complete:

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Team notified

**Next**: Phase 4
