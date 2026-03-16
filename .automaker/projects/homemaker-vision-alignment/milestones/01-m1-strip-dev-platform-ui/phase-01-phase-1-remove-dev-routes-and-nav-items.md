# Phase 1: Phase 1: Remove Dev Routes and Nav Items

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Remove these routes from apps/ui/src/routes/: analytics, ceremonies, designs, docs, file-editor, github-issues, github-prs, project-management, project-management.$slug, project-settings, spec, system-view, stream-overlay, interview, chat-overlay, logged-out, login. Remove corresponding nav items from use-navigation.ts. Remove any sidebar sections that group dev tools (e.g. 'Developer', 'Platform'). Keep: dashboard, board, calendar, todo, notes, maintenance, chat, chat-channel, sensors, inventory, budget, vault, vendors, profile, inbox, notifications, settings, setup. After removal, verify the app builds cleanly (npm run build) and fix any broken imports.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/ui/src/routes/analytics.tsx`
- [ ] `apps/ui/src/routes/ceremonies.tsx`
- [ ] `apps/ui/src/routes/designs.tsx`
- [ ] `apps/ui/src/routes/docs.tsx`
- [ ] `apps/ui/src/routes/file-editor.tsx`
- [ ] `apps/ui/src/routes/github-issues.tsx`
- [ ] `apps/ui/src/routes/github-prs.tsx`
- [ ] `apps/ui/src/routes/project-management.tsx`
- [ ] `apps/ui/src/routes/project-management.$slug.tsx`
- [ ] `apps/ui/src/routes/project-settings.tsx`
- [ ] `apps/ui/src/routes/spec.tsx`
- [ ] `apps/ui/src/routes/system-view.tsx`
- [ ] `apps/ui/src/routes/stream-overlay.tsx`
- [ ] `apps/ui/src/routes/interview.tsx`
- [ ] `apps/ui/src/routes/chat-overlay.tsx`
- [ ] `apps/ui/src/routes/logged-out.tsx`
- [ ] `apps/ui/src/routes/login.tsx`
- [ ] `apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts`

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
