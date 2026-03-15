# Phase 1: Inject DB into SensorRegistryService and wire persistence

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add BetterSqlite3 DB parameter to SensorRegistryService constructor via ServiceContainer. Ensure sensor_readings table is created. Wire report() to persist readings. Verify getHistory() and getHistoryAggregated() query real data.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/sensor-registry-service.ts`
- [ ] `apps/server/src/server/services.ts`

### Verification
- [ ] SensorRegistryService receives DB via constructor injection
- [ ] sensor_readings table is created on service init
- [ ] report() persists readings to SQLite
- [ ] getHistory() returns real persisted data
- [ ] getHistoryAggregated() returns real aggregated data

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
