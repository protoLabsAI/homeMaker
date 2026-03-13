# Phase 1: Wire assignedRole into getModelForFeature()

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Modify getModelForFeature() in apps/server/src/services/auto-mode/execution-service.ts to check the assigned role's model override BEFORE falling back to complexity-based selection.

New priority chain:
1. feature.model (explicit per-feature override) — unchanged
2. Failure escalation (2+ failures → opus) — unchanged
3. Architectural complexity → opus — unchanged
4. **NEW: assignedRole model override** — if feature.assignedRole is set, check:
   a. AgentManifestService.getAgent(projectPath, assignedRole) for manifest model override
   b. WorkflowSettings.agentConfig.roleModelOverrides[assignedRole] for settings override
5. phaseModels.agentExecutionModel from settings — unchanged
6. Complexity fallback — unchanged

Also check roleModelOverrides from WorkflowSettings (per-project settings.json). The manifest model takes precedence over settings if both exist, but settings override allows users to override manifest defaults without editing YAML.

Files to modify:
- apps/server/src/services/auto-mode/execution-service.ts

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/auto-mode/execution-service.ts`

### Verification
- [ ] getModelForFeature checks assignedRole manifest model after failure escalation
- [ ] WorkflowSettings roleModelOverrides checked as fallback after manifest
- [ ] Existing priority chain (explicit model, failure escalation, complexity) unchanged
- [ ] Features without assignedRole behave exactly as before
- [ ] Unit tests cover: role with manifest model, role with settings override, role with both, unknown role fallback

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
