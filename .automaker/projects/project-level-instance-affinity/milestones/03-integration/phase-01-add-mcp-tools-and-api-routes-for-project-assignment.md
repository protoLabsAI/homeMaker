# Phase 1: Add MCP tools and API routes for project assignment

**Duration**: 0.5-1 week
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add four MCP tools: assign_project, unassign_project, list_project_assignments, reassign_orphaned_projects. Add corresponding Express route handlers in apps/server/src/routes/projects/assignment.ts. Wire routes into projects router. Register tools in MCP tool registry.

---

## Tasks

### Files to Create/Modify
- [ ] `packages/mcp-server/src/tools/project-tools.ts`
- [ ] `apps/server/src/routes/projects/assignment.ts`
- [ ] `apps/server/src/routes/projects/index.ts`

### Verification
- [ ] assign_project MCP tool works end-to-end
- [ ] unassign_project MCP tool works end-to-end
- [ ] list_project_assignments returns all assignments
- [ ] reassign_orphaned_projects triggers orphan detection
- [ ] API routes delegate to ProjectAssignmentService
- [ ] Tools registered in MCP registry

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
