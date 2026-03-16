---
tags: [api]
summary: api implementation decisions and patterns
relevantTo: [api]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 9
  referenced: 8
  successfulFeatures: 8
---
# api

#### [Gotcha] HA WebSocket protocol requires strict message ordering: auth handshake must complete (auth_ok received) before subscribe_events or get_states calls. Messages sent before auth_ok are silently ignored. (2026-03-15)
- **Situation:** Implementing HA WebSocket client connection flow
- **Root cause:** HA's WebSocket server enforces authentication state before processing subscriptions. This is a protocol constraint, not a performance optimization.
- **How to avoid:** Requires sequential message sending (simpler correctness logic) vs potential throughput loss (negligible in practice since auth is < 100ms)

#### [Gotcha] get_states must be called after auth_ok to fetch initial entity states. Subscribing to state_changed events alone does not provide initial state of existing entities. (2026-03-15)
- **Situation:** Newly discovered HA entities have no state value until their first state_changed event after subscription
- **Root cause:** Event subscriptions only catch future changes. Existing entity state is never pushed; it must be explicitly requested via get_states. Without this, entities registered from HA remain in unknown state until they change.
- **How to avoid:** Adds one extra message (get_states) per connection, but guarantees complete initial state coverage. Trade-off is negligible (typically < 1KB response)

#### [Pattern] Initial state fetch before event subscription: fetch current state for all selected entities on connect, then subscribe to future changes (2026-03-15)
- **Problem solved:** Event subscription alone provides only future state changes, missing the current state at connection time
- **Why this works:** Prevents readings from being undefined/stale between connect and first change event; ensures consistency
- **Trade-offs:** Slightly larger initial payload, but guarantees complete state picture from start

#### [Pattern] Distinct error handling: auth errors fail permanently without retry; network errors retry with exponential backoff (2026-03-15)
- **Problem solved:** Invalid token indicates configuration error; network error indicates transient connectivity issue
- **Why this works:** Prevents log spam and resource waste on unrecoverable auth failures while maintaining resilience to temporary outages
- **Trade-offs:** More complex error classification code, but appropriate resource usage for different failure types

#### [Gotcha] POST /api/maintenance/:id/complete returns nested structure `{ data: { schedule, completion } }` not flat `{ data: completion }` (2026-03-16)
- **Situation:** Completion endpoint responds with both the updated schedule and the completion record in data object
- **Root cause:** API design choice to provide related context (schedule) alongside the completion result in single response
- **How to avoid:** One request gives more context; clients must dig deeper into response structure

#### [Gotcha] Achievement data uses different field names across endpoints: catalog uses `earned`/`unlockedAt`, profile uses array of `{id, unlockedAt, seen}` (2026-03-16)
- **Situation:** GET /api/gamification/achievements (catalog) vs data within GET /api/gamification/profile (achievements array) have different structures
- **Root cause:** Profile endpoint optimized for quick access (array of earned achievements only); catalog endpoint shows full achievement metadata
- **How to avoid:** Reduces profile payload size but requires tests/clients to understand multiple representations of achievement state

#### [Gotcha] Gamification profile uses `xp` field (not `totalXp`); field naming inconsistency between endpoints requires explicit discovery (2026-03-16)
- **Situation:** Expected `totalXp` based on common naming pattern; actual API uses abbreviated `xp`
- **Root cause:** API payload optimization decision; shorter field names reduce response size at cost of less descriptive naming
- **How to avoid:** Smaller JSON payloads; less self-documenting field names requiring API documentation or discovery

#### [Pattern] Agent factory pattern (createHomeResearchAgent) instantiates with specific tools (WebSearch + WebFetch only) and model (sonnet) rather than parameterizing them (2026-03-16)
- **Problem solved:** Agent creation follows pattern used by Ava/PM/LE agents; each has fixed toolset and model
- **Why this works:** Hard-coded tool/model bindings enforce explicit capability boundaries at creation time — prevents accidental capability mixing and makes agent behavior predictable and reviewable
- **Trade-offs:** Rigid per-agent design makes each agent clear but requires new factory for new capability combinations; parameterization is more flexible but harder to audit