---
tags: [documentation]
summary: documentation implementation decisions and patterns
relevantTo: [documentation]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 7
  referenced: 6
  successfulFeatures: 6
---
# documentation

#### [Pattern] Source TypeScript JSDoc as authoritative reference for behavioral constraints in documentation (2026-03-15)
- **Problem solved:** Calendar run-command constraint (no shell metacharacters) was documented by deriving it from JobAction JSDoc
- **Why this works:** Single source of truth prevents docs drifting from implementation; code comments are closer to implementation changes
- **Trade-offs:** Requires discipline to keep JSDoc updated alongside code changes, but guarantees docs accuracy