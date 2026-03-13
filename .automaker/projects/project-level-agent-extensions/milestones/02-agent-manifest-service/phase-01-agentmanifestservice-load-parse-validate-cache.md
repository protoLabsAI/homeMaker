# Phase 1: AgentManifestService — load, parse, validate, cache

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

Create apps/server/src/services/agent-manifest-service.ts as a singleton service.

Responsibilities:
1. loadManifest(projectPath): Discovers .automaker/agents.yml (single file) OR .automaker/agents/*.yml (directory of files). Parses YAML using the js-yaml package (already a dependency via other packages in the monorepo — verify before adding). Validates against ProjectAgent type. Returns AgentManifest.

2. getAgentsForProject(projectPath): Returns cached manifest or loads fresh. Cache key is projectPath. Cache invalidation on file change (fs.watch on the agents directory).

3. getAgent(projectPath, roleName): Lookup a specific agent by name. Returns ProjectAgent | undefined.

4. getResolvedCapabilities(projectPath, roleName): Merges project agent capabilities with its base role (extends field) from ROLE_CAPABILITIES. Returns full RoleCapabilities.

5. matchFeature(projectPath, feature): Runs all project agents' match rules against a feature's category, title, description, and filesToModify. Returns the best-matching ProjectAgent or null.

Register as singleton in the service registry pattern used by other services.

IMPORTANT: Check if js-yaml is already a dependency in the monorepo. If not, use a simple YAML parser or JSON with comments. The constraint is no NEW npm dependencies — but js-yaml may already exist.

Files to create:
- apps/server/src/services/agent-manifest-service.ts

Files to modify:
- apps/server/src/services/index.ts (register in service exports if barrel exists)

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/agent-manifest-service.ts`
- [ ] `apps/server/src/services/index.ts`

### Verification
- [ ] loadManifest reads .automaker/agents.yml or .automaker/agents/*.yml
- [ ] Validates parsed YAML against ProjectAgent schema
- [ ] Caches per projectPath with file-watch invalidation
- [ ] matchFeature checks categories, keywords, filePatterns
- [ ] getResolvedCapabilities merges with base role from ROLE_CAPABILITIES
- [ ] Unit tests cover: load single file, load directory, match rules, cache invalidation

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
