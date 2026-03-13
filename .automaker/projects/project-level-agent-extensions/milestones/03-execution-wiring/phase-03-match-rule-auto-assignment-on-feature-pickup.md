# Phase 3: Match rule auto-assignment on feature pickup

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Before auto-mode picks up a feature for execution, run match rules to auto-assign a role if none is set.

Modify the feature pickup path in execution-service.ts (or auto-mode-service.ts where features are dequeued). After selecting a feature but before calling getModelForFeature():

1. If feature.assignedRole is already set → skip (respect manual assignment)
2. If WorkflowSettings.agentConfig?.autoAssignEnabled === false → skip
3. Call AgentManifestService.matchFeature(projectPath, feature)
4. If a match is found with confidence above threshold:
   a. Set feature.assignedRole = match.name
   b. Set feature.routingSuggestion = { role: match.name, confidence, reasoning, autoAssigned: true, suggestedAt }
   c. Persist via featureLoader.update()
5. Proceed with execution (getModelForFeature will now pick up the assigned role)

Match rule evaluation order:
1. Category exact match (highest confidence)
2. Keyword match in title/description (medium confidence)
3. File pattern match against filesToModify (medium confidence)
4. Multiple matches → pick highest combined confidence

Files to modify:
- apps/server/src/services/auto-mode/execution-service.ts

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/auto-mode/execution-service.ts`

### Verification
- [ ] Features without assignedRole get auto-matched before execution
- [ ] Manual assignedRole is never overwritten
- [ ] autoAssignEnabled=false disables match rule evaluation
- [ ] routingSuggestion populated with match details
- [ ] Features with no matching rules proceed with default behavior
- [ ] Unit tests cover: category match, keyword match, file pattern match, no match, manual override respected

---

## Deliverables

- [ ] Code implemented and working
- [ ] Tests passing
- [ ] Documentation updated

---

## Handoff Checklist

Before marking Phase 3 complete:

- [ ] All tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] PR merged to main
- [ ] Team notified

**Next**: Phase 4
