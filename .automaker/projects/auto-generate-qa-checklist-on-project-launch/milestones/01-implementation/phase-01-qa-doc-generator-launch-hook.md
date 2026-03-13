# Phase 1: QA doc generator + launch hook

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add a private `generateQaDoc(projectPath, project)` method to `ProjectLifecycleService`. The method reads project.milestones, iterates phases with acceptanceCriteria, and builds a markdown QA checklist string. It then calls `this.projectService.createDoc()` to save it as a document titled 'QA Checklist'. Hook the call into the existing `launch()` method after backlog features are confirmed, wrapped in try/catch so it never fails the launch. Add idempotency check: call `this.projectService.listDocs()` first and skip if a doc titled 'QA Checklist' already exists.

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/project-lifecycle-service.ts`

### Verification
- [ ] Launching a project with milestones/phases creates a 'QA Checklist' document in Resources
- [ ] The document is organized by milestone and phase headings
- [ ] Each acceptance criterion appears as a markdown checkbox item (- [ ] ...)
- [ ] Launching a project with no milestones does not error — launch proceeds normally
- [ ] Launching a project where 'QA Checklist' doc already exists does not create a duplicate
- [ ] If doc creation throws, the error is logged and launch still succeeds
- [ ] npm run build:packages && npm run typecheck passes with no new errors

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
