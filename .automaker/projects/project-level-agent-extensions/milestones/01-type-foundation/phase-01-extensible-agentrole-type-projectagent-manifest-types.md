# Phase 1: Extensible AgentRole type + ProjectAgent manifest types

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

1. Change AgentRole from union type to `string` with a BUILT_IN_AGENT_ROLES const array for the 8 existing roles. Update ROLE_CAPABILITIES to use Record<string, RoleCapabilities> instead of Record<AgentRole, ...>. This keeps all existing code working while allowing arbitrary role strings.

2. Create new file libs/types/src/agent-manifest.ts with:
- ProjectAgent interface: name, extends (base role), description, model override, promptFile path, capabilities (partial RoleCapabilities), match rules (categories, keywords, filePatterns)
- AgentManifest interface: agents array, version
- AgentMatchRules interface: categories string[], keywords string[], filePatterns string[]
- DEFAULT_PROJECT_AGENT constant for sensible defaults

3. Export from libs/types/src/index.ts barrel.

4. Update feature.ts: assignedRole type stays string (already compatible since AgentRole becomes string).

Files to modify:
- libs/types/src/agent-roles.ts
- libs/types/src/agent-manifest.ts (new)
- libs/types/src/index.ts

---

## Tasks

### Files to Create/Modify
- [ ] `libs/types/src/agent-roles.ts`
- [ ] `libs/types/src/agent-manifest.ts`
- [ ] `libs/types/src/index.ts`

### Verification
- [ ] AgentRole is string type, BUILT_IN_AGENT_ROLES has the 8 existing roles
- [ ] ROLE_CAPABILITIES keyed by string, existing role lookups unchanged
- [ ] ProjectAgent, AgentManifest, AgentMatchRules types exported from @protolabsai/types
- [ ] npm run build:packages succeeds
- [ ] npm run test:packages passes (existing tests unbroken)

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
