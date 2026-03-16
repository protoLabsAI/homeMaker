# Phase 2: Phase 2: Clean Up Orphaned View Components

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

After route removal, identify and remove orphaned view component directories that are no longer referenced by any route: analytics-view, designs-view, docs-view, file-editor-view, github-issues-view, project-settings-view. Check for any shared components imported by both home and dev views — keep those. Verify build still passes. Remove any unused imports in remaining components that referenced deleted views.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/ui/src/components/views/analytics-view/`
- [ ] `apps/ui/src/components/views/designs-view/`
- [ ] `apps/ui/src/components/views/docs-view/`
- [ ] `apps/ui/src/components/views/file-editor-view/`
- [ ] `apps/ui/src/components/views/github-issues-view/`
- [ ] `apps/ui/src/components/views/project-settings-view/`

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
