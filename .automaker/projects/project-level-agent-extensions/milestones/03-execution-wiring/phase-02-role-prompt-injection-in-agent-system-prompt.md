# Phase 2: Role prompt injection in agent system prompt

**Duration**: 1-1.5 weeks
**Owner**: TBD
**Dependencies**: None
**Parallel Work**: Can run alongside other phases (if applicable)

---

## Overview

When a feature has an assignedRole with a prompt file defined in the manifest, load that prompt file and prepend it to the agent's system prompt.

Modify the prompt construction path in execution-service.ts where contextFilesPrompt is built. After loading .automaker/context/*.md files, also check if the feature's assignedRole has a promptFile in the manifest. If so, read the file and prepend it as a role-specific instruction block.

Prompt injection format:
```
## Agent Role: {agent.name}
{agent.description}

{contents of agent.promptFile}

---
{existing context files}
{existing system prompt}
```

The promptFile path is relative to projectPath (e.g., .claude/agents/kai.md or .automaker/agents/prompts/kai.md).

Files to modify:
- apps/server/src/services/auto-mode/execution-service.ts

---

## Tasks

### Files to Create/Modify
- [ ] `apps/server/src/services/auto-mode/execution-service.ts`

### Verification
- [ ] Role prompt file loaded when assignedRole has promptFile in manifest
- [ ] Prompt prepended before context files in system prompt
- [ ] Missing promptFile logs warning but doesn't break execution
- [ ] Features without assignedRole or without promptFile work unchanged
- [ ] Prompt injection follows the format: role header + prompt content + separator

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
