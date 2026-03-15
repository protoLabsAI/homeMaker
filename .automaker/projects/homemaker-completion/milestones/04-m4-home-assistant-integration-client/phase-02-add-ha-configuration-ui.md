# Phase 2: Add HA configuration UI

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add Home Assistant configuration section in settings with URL, access token, connection status indicator, and entity mapping management.

---

## Tasks

### Files to Create/Modify

- [ ] `apps/ui/src/components/views/settings-view/ha-section.tsx`
- [ ] `apps/ui/src/components/views/settings-view/index.tsx`

### Verification

- [ ] Settings UI has Home Assistant section
- [ ] Can configure HA URL and access token
- [ ] Shows connection status (connected/disconnected/error)
- [ ] Lists discovered HA entities with sensor mapping
- [ ] Can enable/disable individual entity sync

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
