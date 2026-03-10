# Phase 1: Create ProjectAssignmentService

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

New service that manages project-to-instance assignment. Methods: assignProject, unassignProject, getAssignments, getMyAssignedProjects, claimPreferredProjects (boot-time), reassignOrphanedProjects. Register in ServiceContainer. Wire claimPreferredProjects into server startup. Uses ProjectService for persistence and CRDTSyncService for peer heartbeat status.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/project-assignment-service.ts`
- [ ] `apps/server/src/server/services.ts`

### Verification
- [ ] ProjectAssignmentService registered in ServiceContainer
- [ ] assignProject writes assignedTo/assignedAt/assignedBy to project via ProjectService
- [ ] unassignProject clears assignment fields
- [ ] claimPreferredProjects reads proto.config.yaml and claims unassigned projects on boot
- [ ] reassignOrphanedProjects detects stale heartbeats (>120s) and auto-claims orphans
- [ ] Unit tests cover assign, unassign, claim, and orphan reassignment
- [ ] npm run test:server passes

---

## Deliverables

- [ ] Code implemented and working
- [ ] Tests passing
- [ ] Documentation updated

---

## Handoff Checklist

Before marking Phase 1 complete:

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Team notified

**Next**: Phase 2
