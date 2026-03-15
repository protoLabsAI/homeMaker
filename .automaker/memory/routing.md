---
tags: [routing]
summary: routing implementation decisions and patterns
relevantTo: [routing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# routing

#### [Gotcha] Route order matters critically: `/api/vault/search` must be registered before `/:id` route to prevent param capture conflicts. Search requests would be intercepted by the ID route if order is reversed. (2026-03-15)
- **Situation:** Setting up REST routes for vault CRUD + search operations
- **Root cause:** Express matches routes in registration order. A generic `/:id` route will capture any path segment, including 'search'.
- **How to avoid:** Requires explicit awareness of routing order, not self-documenting. Fragile to route additions.