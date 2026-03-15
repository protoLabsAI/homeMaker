# Phase 1: Build HA WebSocket client service

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Create HAClientService that connects to a Home Assistant instance via WebSocket API, authenticates with long-lived access token, subscribes to state_changed events, and auto-registers HA entities as homeMaker sensors via SensorRegistryService.

---

## Tasks

### Files to Create/Modify

- [ ] `apps/server/src/services/ha-client-service.ts`
- [ ] `apps/server/src/routes/integrations/ha.ts`
- [ ] `apps/server/src/server/services.ts`
- [ ] `apps/server/src/server/routes.ts`

### Verification

- [ ] HAClientService connects to HA WebSocket API
- [ ] Authenticates with long-lived access token
- [ ] Subscribes to state_changed events
- [ ] Auto-registers HA entities as homeMaker sensors
- [ ] Reconnects on disconnect with backoff
- [ ] REST endpoints for connection status and entity list

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
