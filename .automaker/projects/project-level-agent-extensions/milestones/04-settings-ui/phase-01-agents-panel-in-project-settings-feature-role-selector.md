# Phase 1: Agents panel in project settings + feature role selector

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Two UI additions:

1. **Project Settings — Agents Panel**: Add an Agents section to the project settings view. Shows a list of discovered project agents (from /api/agents/list) with:
- Agent name, description, base role (extends), model override
- Match rules summary (categories, keywords)
- Whether auto-assignment is enabled (toggle)

2. **Feature Card — Role Selector**: In the feature detail/edit view, add a dropdown for assignedRole that shows:
- Built-in roles (8 defaults)
- Project agents (from manifest)
- Current assignment highlighted
- 'Auto' option that clears assignedRole (lets match rules decide)

Use existing UI patterns: Select component from @protolabsai/ui/atoms, same Card/PropertyRow patterns as project-sidebar.tsx.

Add React Query hook for fetching agents list.

Files to create:
- apps/ui/src/components/views/projects-view/components/agents-panel.tsx
- apps/ui/src/hooks/use-agents.ts

Files to modify:
- apps/ui/src/components/views/projects-view/project-settings-view.tsx (or equivalent settings page — add Agents panel)
- Feature detail component (add role selector)

---

## Tasks

### Files to Create/Modify
- [ ] `apps/ui/src/components/views/projects-view/components/agents-panel.tsx`
- [ ] `apps/ui/src/hooks/use-agents.ts`
- [ ] `apps/ui/src/components/views/projects-view/project-settings-view.tsx`

### Verification
- [ ] Agents panel shows built-in + project agents in settings view
- [ ] Feature card has assignedRole dropdown with all available roles
- [ ] Auto option clears assignedRole for match-rule-based assignment
- [ ] React Query hook fetches from /api/agents/list
- [ ] No new UI dependencies — uses existing atoms/patterns

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
