# Phase 1: Add project assignment types and createdByInstance field

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add project type enum (finite/ongoing), assignment fields (assignedTo, assignedAt, assignedBy) to Project interface. Add createdByInstance to Feature. Add projectPreferences to ProtoConfig. Remove fleet scheduler message types (WorkInventory, ScheduleAssignment, SchedulerHeartbeat, ScheduleConflict) from ava-channel types. Replace ongoing boolean with type field on Project and update all consumers.

---

## Tasks

### Files to Create/Modify
- [ ] `libs/types/src/project.ts`
- [ ] `libs/types/src/feature.ts`
- [ ] `libs/types/src/proto-config.ts`
- [ ] `libs/types/src/ava-channel.ts`
- [ ] `libs/types/src/index.ts`

### Verification
- [ ] Project interface has type: 'finite' | 'ongoing', assignedTo, assignedAt, assignedBy fields
- [ ] Feature interface has createdByInstance field
- [ ] ProtoConfig has projectPreferences with preferredProjects and overflowEnabled
- [ ] Fleet scheduler message types removed from ava-channel.ts
- [ ] All consumers of removed types updated (no TypeScript errors)
- [ ] npm run build:packages succeeds
- [ ] npm run typecheck succeeds

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
