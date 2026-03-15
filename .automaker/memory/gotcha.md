---
tags: [gotcha]
summary: gotcha implementation decisions and patterns
relevantTo: [gotcha]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# gotcha

#### [Gotcha] Worktree lacks node_modules, preventing local TypeScript verification. Must use tsc from sibling worktrees to distinguish module-resolution errors (pre-existing) from logic errors (none found). (2026-03-15)
- **Situation:** Trying to verify TypeScript build in feature-maintenance-scheduling-ui-view worktree
- **Root cause:** Worktree isolation uses git worktree without duplicating entire node_modules; shared monorepo tooling approach
- **How to avoid:** Lightweight worktree but requires knowledge of sibling tooling locations; type safety verified indirectly