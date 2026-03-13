# Phase 2: API routes for agent manifest

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Add Express routes to expose discovered agents:

1. POST /api/agents/list — returns all agents (built-in + project) for a given projectPath
2. POST /api/agents/get — returns a single agent by name with resolved capabilities
3. POST /api/agents/match — given a feature ID, returns the best-matching agent

All routes require projectPath in body. Built-in roles are always included in the list response, merged with any project manifest overrides.

Create route file following existing patterns in apps/server/src/routes/.

Files to create:
- apps/server/src/routes/agents.ts

Files to modify:
- apps/server/src/routes/index.ts (register routes)

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/routes/agents.ts`
- [ ] `apps/server/src/routes/index.ts`

### Verification
- [ ] POST /api/agents/list returns built-in + project agents
- [ ] POST /api/agents/get returns single agent with resolved capabilities
- [ ] POST /api/agents/match runs match rules against a feature
- [ ] Routes follow existing Express route patterns
- [ ] Error handling for missing projectPath, invalid agent names

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
