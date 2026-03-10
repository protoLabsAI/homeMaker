# Phase 2: Update feature selection to be project-scoped

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Modify FeatureScheduler.loadPendingFeatures() to filter by project ownership. Features eligible if: projectSlug in assigned projects, OR projectSlug null and createdByInstance matches, OR projectSlug unassigned and overflow enabled. Sort: assigned > own unassigned > overflow. Stamp createdByInstance in FeatureLoader.create(). When no instance identity configured, bypass affinity filtering (backward compat for single-instance).

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/feature-scheduler.ts`
- [ ] `apps/server/src/services/feature-loader.ts`
- [ ] `apps/server/src/services/auto-mode-service.ts`

### Verification
- [ ] loadPendingFeatures filters by project assignment when instance identity is configured
- [ ] Single-instance setups with no proto.config.yaml work unchanged
- [ ] FeatureLoader.create stamps createdByInstance from current instance ID
- [ ] Sort order: assigned projects first, then own unassigned, then overflow
- [ ] Unit tests cover all three filter paths plus single-instance fallback
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
