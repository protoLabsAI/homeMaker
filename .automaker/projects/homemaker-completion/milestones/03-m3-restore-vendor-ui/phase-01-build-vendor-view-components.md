# Phase 1: Build vendor view components

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Rebuild vendor list, vendor card, add-vendor dialog, and vendor detail panel components. Create use-vendors hook for data fetching. Follow existing inventory-view patterns. Use surviving Storybook stories as design spec.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/ui/src/components/views/vendors-view/index.tsx`
- [ ] `apps/ui/src/components/views/vendors-view/vendor-list.tsx`
- [ ] `apps/ui/src/components/views/vendors-view/vendor-card.tsx`
- [ ] `apps/ui/src/components/views/vendors-view/add-vendor-dialog.tsx`
- [ ] `apps/ui/src/components/views/vendors-view/vendor-detail-panel.tsx`
- [ ] `apps/ui/src/hooks/use-vendors.ts`

### Verification
- [ ] Vendor list displays all vendors from API
- [ ] Vendor card shows name, trade, phone, rating
- [ ] Add-vendor dialog creates new vendors via API
- [ ] Vendor detail panel shows full info with linked assets
- [ ] Storybook stories render correctly

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
