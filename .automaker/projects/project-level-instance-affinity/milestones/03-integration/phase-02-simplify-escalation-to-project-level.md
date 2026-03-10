# Phase 2: Simplify escalation to project-level

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Remove feature-level escalation handlers (escalation_request, escalation_offer, escalation_accept) from ava-channel-reactor-service.ts. Replace with a simple project_blocked broadcast when a project has 3+ blocked features. No automated negotiation — Ava reassigns the project via assign_project MCP tool. Remove pendingEscalations tracking.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/ava-channel-reactor-service.ts`

### Verification
- [ ] Feature-level escalation handlers removed
- [ ] pendingEscalations map removed
- [ ] project_blocked message broadcast when project has 3+ blocked features
- [ ] No automated escalation negotiation remains
- [ ] npm run test:server passes

---

## Deliverables

- [ ] Code implemented and working
- [ ] Tests passing
- [ ] Documentation updated

---

## Handoff Checklist

Before marking Phase 2 complete:

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Team notified

**Next**: Phase 3
