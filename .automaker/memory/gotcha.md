---
tags: [gotcha]
summary: gotcha implementation decisions and patterns
relevantTo: [gotcha]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# gotcha

#### [Gotcha] Feature spec omitted required backend routes (/api/ha/test, /api/ha/entities). Had to add these to avoid non-functional UI. (2026-03-15)
- **Situation:** UI component cannot discover entities or test connections without backend support, but spec only defined frontend component
- **Root cause:** Applied [auto-fix-critical] rule because UI critical path depends on backend routes. Spec was incomplete.
- **How to avoid:** Expanded scope beyond spec but feature actually works. Incomplete specification discovered during implementation.