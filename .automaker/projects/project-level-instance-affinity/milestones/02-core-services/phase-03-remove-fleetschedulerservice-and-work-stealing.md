# Phase 3: Remove FleetSchedulerService and work-stealing

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Delete fleet-scheduler-service.ts entirely. Remove all consumers: ava-channel-reactor.module.ts (instantiation), services.ts (ServiceContainer), ava-channel-reactor-service.ts (work_request, work_offer, work_inventory, schedule_assignment, schedule_conflict handlers). Delete fleet-status.ts route. Remove fleet-status route from projects/index.ts. Keep capacity_heartbeat handler (needed for failover). Remove fleet scheduler test files if any.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/fleet-scheduler-service.ts`
- [ ] `apps/server/src/routes/projects/fleet-status.ts`
- [ ] `apps/server/src/services/ava-channel-reactor-service.ts`
- [ ] `apps/server/src/services/ava-channel-reactor.module.ts`
- [ ] `apps/server/src/server/services.ts`
- [ ] `apps/server/src/routes/projects/index.ts`

### Verification
- [ ] fleet-scheduler-service.ts deleted
- [ ] fleet-status.ts route deleted
- [ ] No references to FleetSchedulerService remain in codebase
- [ ] Work-stealing handlers removed from ava-channel-reactor-service.ts
- [ ] Fleet scheduler message handlers removed from ava-channel-reactor-service.ts
- [ ] capacity_heartbeat handler preserved
- [ ] npm run build succeeds with no TypeScript errors
- [ ] npm run test:server passes

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
