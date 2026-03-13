# Phase 2: Per-project agent config in WorkflowSettings

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add an optional agentConfig section to WorkflowSettings (per-project .automaker/settings.json) that allows per-role model overrides and default agent assignment behavior.

Add to WorkflowSettings interface:
- agentConfig?: { roleModelOverrides?: Record<string, PhaseModelEntry>; autoAssignEnabled?: boolean; manifestPaths?: string[] }

roleModelOverrides maps role name (string) to model config. autoAssignEnabled controls whether match rules run (default: true). manifestPaths allows custom manifest locations beyond the default .automaker/agents/.

Update DEFAULT_WORKFLOW_SETTINGS to not include agentConfig (undefined = use defaults).

Files to modify:
- libs/types/src/workflow-settings.ts

---

## Tasks

### Files to Create/Modify
- [ ] `libs/types/src/workflow-settings.ts`

### Verification
- [ ] agentConfig is optional on WorkflowSettings
- [ ] roleModelOverrides maps string role names to PhaseModelEntry
- [ ] autoAssignEnabled defaults to true when agentConfig is present
- [ ] npm run build:packages succeeds
- [ ] No changes to DEFAULT_WORKFLOW_SETTINGS beyond the new optional field

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
