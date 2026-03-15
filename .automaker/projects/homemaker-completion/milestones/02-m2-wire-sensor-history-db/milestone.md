# M2: M2: Wire Sensor History DB

**Status**: 🔴 Not started
**Duration**: 1-2 weeks (estimated)
**Dependencies**: None

---

## Overview

Inject SQLite DB into SensorRegistryService so sensor readings persist to the sensor_readings table. Make getHistory() and getHistoryAggregated() return real data.

---

## Phases

| Phase | File                                                                                                                                             | Duration  | Dependencies | Owner |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------ | ----- |
| 1     | [phase-01-inject-db-into-sensorregistryservice-and-wire-persistence.md](./phase-01-inject-db-into-sensorregistryservice-and-wire-persistence.md) | 0.5 weeks | None         | TBD   |

---

## Success Criteria

M2 is **complete** when:

- [ ] All phases complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Team reviewed and approved

---

## Outputs

### For Next Milestone

- Foundation work ready for dependent features
- APIs stable and documented
- Types exported and usable

---

## Handoff to M3

Once M2 is complete, the following can begin:

- Next milestone phases that depend on this work
- Parallel work streams that were blocked

---

**Next**: [Phase 1](./phase-01-inject-db-into-sensorregistryservice-and-wire-persistence.md)
