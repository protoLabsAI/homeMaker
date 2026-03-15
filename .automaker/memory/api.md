---
tags: [api]
summary: api implementation decisions and patterns
relevantTo: [api]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 547
  referenced: 147
  successfulFeatures: 147
---
<!-- domain: API Design & Integration | GitHub GraphQL, REST endpoints, HTTP client patterns -->

# api

### Using GitHub GraphQL API with resolveReviewThread mutation rather than REST API for thread resolution (2026-02-10)

- **Context:** Need to fetch thread list and resolve threads programmatically.
- **Why:** GraphQL provides single query to fetch all thread data with author info (needed to filter bots). Native `resolveReviewThread` mutation is more reliable than constructing REST endpoints. Better performance than N+1 REST calls.
- **Rejected:** REST API — no single endpoint for bulk thread operations. Would require multiple sequential calls and manual pagination.
- **Breaking if changed:** If switched back to REST API, would need to restructure as multiple sequential calls and handle pagination manually.

### mergePR() call passes waitForCI: true by default (from settings), causing merge to block until CI checks complete (2026-02-10)

- **Context:** Merge should only happen when CI passes. GitHub branch protection requires status checks to pass before merge.
- **Why:** Avoids race condition where merge executes before CI finishes. GitHub API rejects merge if checks pending.
- **Breaking if changed:** If waitForCI is hardcoded false, merge frequently fails due to pending checks. Features marked blocked incorrectly (timing issue, not a real block).

### Use 409 Conflict for 'cannot delete worktree because agent is running' rather than 400 or 403 (2026-02-10)

- **Context:** DELETE /api/worktree/delete route needs to distinguish between invalid input vs. resource conflict.
- **Why:** 409 Conflict semantically matches the situation: request is valid but cannot be processed due to conflict with existing state (running agent). 400 suggests malformed request. 403 suggests permission denied.
- **Rejected:** 400 Bad Request (wrong — request IS well-formed), 403 Forbidden (wrong — not a permission issue).
- **Breaking if changed:** Clients that check for '!= 409' to allow deletion will incorrectly skip safety check if code changes to use different status code.

### DiscordBotService.sendToChannel() returns boolean for success/failure rather than throwing exceptions (2026-02-12)

- **Context:** Hookable event system where Discord failure shouldn't block event processing. User-configured hooks are best-effort notifications.
- **Why:** Returning boolean for known failure states (channel not found, permissions) allows callers to decide response. Throwing only on unexpected errors preserves the distinction.
- **Breaking if changed:** If changed to throw on every failure, event processing could crash if Discord is unreachable. If changed to never throw, unexpected errors become silent.

### System prompt prepended (not replaced) when a role-specific prompt is provided to AgentService (2026-02-12, updated 2026-03-11)

- **Context:** AgentService accepts an optional systemPrompt override alongside the base session prompt. Role prompts from `@protolabsai/prompts` are prepended rather than replacing the base prompt. (Note: the dynamic AgentTemplate/RoleRegistryService system was removed in commit 2a1563ca — role prompts are now hardcoded functions in `libs/prompts/src/agents/`.)
- **Why:** Prepending preserves existing system prompt semantics while adding role directives. Allows role context to augment, not override. Backward compatible.
- **Breaking if changed:** If changed to replacement, role-based agent executions would lose the original system prompt, breaking agents that rely on base directives.

#### [Gotcha] API method names are inconsistent across query hooks — getAll() vs list() vs status(). Must review existing hooks before implementing new data fetching to avoid using non-existent methods. (2026-02-12)

- **Situation:** Initially attempted to use api.features.list() and api.autoMode.getRunningAgents() which don't exist.
- **Root cause:** Codebase has organic growth with different naming conventions across different API endpoints. No centralized API spec or TypeScript types enforce consistency.
- **How to avoid:** Examine existing use-\*.ts hook files before implementing new API calls.

### Error handling in data fetching throws Error when API result.success is false, rather than returning error state directly (2026-02-12)

- **Context:** React Query's useQuery automatically wraps thrown errors in query.error state.
- **Why:** Consistent with React Query patterns — framework handles error state management. Component doesn't need to handle different error formats.
- **Breaking if changed:** If error throwing is replaced with return values, error state in components becomes undefined and errors are silently ignored.

### Preserved exact function signature and return type on extracted pure functions — no convenience wrappers or API envelope (2026-02-13)

- **Context:** Could have added convenience methods like researchRepoSync(), caching layer, filtering options, or { success, data, error } envelope.
- **Why:** Original function signature is already clean. Adding convenience layers now prevents future use cases. Single Responsibility: one function does one thing. Callers handle async/await themselves.
- **Breaking if changed:** If signature changes, all callers break. Future convenience features need new functions (researchRepoWithCache, etc.) not modifications to original.

#### [Gotcha] JSON output mode must be completely non-interactive (no prompts, no spinners, pure stdout) to work in CI/CD pipelines and automation contexts (2026-02-13)

- **Situation:** Created --json flag but initial implementation accidentally mixed in prompt logic when --json was set.
- **Root cause:** CI/CD pipelines and automation tools expect deterministic stdout they can parse. Any interactive prompt causes await to hang indefinitely. Spinners add ANSI codes that break JSON parsing.
- **How to avoid:** Explicit code path check: `if (options.json) { /* skip all interactive UX */ }`.

#### [Gotcha] Automaker server connectivity check must happen LATE in validation pipeline, not early (2026-02-13)

- **Situation:** CLI checks Automaker server availability. Initial placement was early (right after environment checks).
- **Root cause:** Automaker server may not be running yet. Checking early produces false-positive FATAL errors. Checking late (before CI/CD phase): if server down, only that phase fails (RECOVERABLE).
- **How to avoid:** Structure CLI phases so server-dependent steps are late, after local environment validation completes.

#### [Gotcha] Discord rate limiting (429) requires retry-after header parsing AND exponential backoff fallback (2026-02-13)

- **Situation:** Initial implementation only checked for retry-after header; discovered that missing header still causes 429s on rapid requests.
- **Root cause:** Discord's rate limiting is endpoint-specific and bucket-based. retry-after header is not always present on 429 responses.
- **How to avoid:** Always implement both: `retry-after` header parsing + exponential backoff (2^attempt) as safety net.

#### [Pattern] Return status objects {success: boolean, error?: string, data?: T} from phase functions instead of throwing (2026-02-13)

- **Problem solved:** CLI workflows need to continue through failed phases (e.g., create project even if Discord setup fails).
- **Why this works:** Throwing exceptions halts the pipeline; status objects allow caller to decide retry/skip/abort logic.
- **Trade-offs:** Every caller must check success flag (verbose), but caller controls error handling strategy.

### Prompt for guild ID interactively when not provided, rather than making it a required flag (2026-02-13)

- **Context:** Discord phase accepts --guild-id flag but also prompts user if missing; creates dual-path UX.
- **Why:** Balances CLI flexibility (automation via --guild-id) with usability (interactive discovery for new users).
- **Breaking if changed:** Removing interactive prompt breaks manual users; removing flag breaks automation.

#### [Pattern] Each provider implements graceful credential validation with clear error messages and installation URLs, allowing tests and CLI tools to skip functionality rather than hard-fail (2026-02-13)

- **Problem solved:** Three providers with different credential requirements: Groq (API key), Ollama (running service), Bedrock (AWS credentials + region).
- **Why this works:** Prevents hard failures in CI/local dev when optional providers aren't configured. Users can choose to configure only providers they need.
- **Trade-offs:** Tests must explicitly check for 'skipped' status rather than assuming availability.

#### [Gotcha] GitHub API pagination: listing PR review threads returns max 100 items per page. PRs with >100 threads silently drop threads without pagination (2026-02-10)

- **Situation:** GraphQL query fetches review threads with `first: 100`. PRs with >100 threads lose threads beyond the page limit.
- **Root cause:** GitHub GraphQL requires explicit cursor-based pagination. There's no way to fetch all items without implementing pagination loop.
- **How to avoid:** For most PRs, 100 threads is sufficient. Add `pageInfo { hasNextPage, endCursor }` to query and implement pagination loop if thread count regularly exceeds 100.

#### [Pattern] getServerUrl() implements strict precedence: localStorage override > cached value > environment variable. The precedence order is non-configurable and critical. (2026-03-11)

- **Problem solved:** Resolving multiple server URL sources with different specificity levels
- **Why this works:** Precedence chain implements proper specificity: user intent (override) > transient state (cache) > static config (env). Prevents static config from shadowing user choice.
- **Trade-offs:** Gained: Clean override semantics without code changes. Lost: Hidden state machine - source of truth is precedence-dependent, complicates debugging

#### [Pattern] Activation deactivates on any space in input (`!input.includes(' ')`), limiting to single-word search queries (2026-03-11)

- **Problem solved:** Need simple rule to detect slash-command mode vs regular text input
- **Why this works:** Simple binary check; avoids complex command parsing logic. Prevents confusion between `/command arg1 arg2` (command execution) vs `/quer` (autocomplete search)
- **Trade-offs:** Simpler activation logic vs limited search capability (can't search multi-word command names like 'Create New File'); clear UX boundary

#### [Gotcha] Case-insensitive filtering requires toLowerCase() on both query and field, but natural include() is case-sensitive (2026-03-11)

- **Situation:** Spec requires 'case-insensitive substring match' but naive implementation would use case-sensitive includes()
- **Root cause:** JavaScript's includes() is case-sensitive; case-insensitive search requires normalizing both sides to same case
- **How to avoid:** toLowerCase() on every filter call is cheap; adds minimal complexity; regex alternative more powerful but harder to read and maintain

#### [Pattern] getServerUrl() uses explicit precedence chain: override → env var → window.location.origin, not boolean flags or computed defaults (2026-03-11)

- **Problem solved:** Multiple sources of server URL truth: user selection (override), deployment config (env), browser location. Need predictable resolution.
- **Why this works:** Explicit chain makes precedence obvious and testable. User's explicit choice wins, deployment config is fallback, browser is last resort.
- **Trade-offs:** Flat chain is less DRY than config object, but more readable and harder to get wrong

### Hook result mapped through normalizer before passing to ChatInput: extracts {name, description, source, argHint} only (2026-03-11)

- **Context:** useSlashCommands returns SlashCommand with internal structure; ChatInput receives UseSlashCommandsResult with normalized subset
- **Why:** Decouples ChatInput from hook's internal structure. ChatInput only needs to know what it displays (name, description, etc.). If hook internals change, ChatInput remains unaffected. Contract is explicit via UseSlashCommandsResult type.
- **Rejected:** Passing raw hook commands directly to ChatInput; exporting full SlashCommand type through the boundary
- **Trade-offs:** One-line map() adds minimal overhead, but enforces encapsulation. Prevents accidental coupling to hook internals. Adding new display property requires explicit map update (good: catches intent).
- **Breaking if changed:** Removing the map and passing raw commands tightly couples ChatInput to hook's SlashCommand shape. Hook refactors could break ChatInput unexpectedly.

### Renamed CrdtFeatureEvent to CrdtSyncWireMessage to match semantic meaning (type carries all wire messages: project events, settings events, etc., not just feature events) (2026-03-12)

- **Context:** Type was used for generic wire message transport, but name incorrectly suggested it only carried feature events
- **Why:** Accurate type names prevent future developer confusion about what the type represents; mis-named types lead to incorrect assumptions and bugs
- **Rejected:** Keeping name CrdtFeatureEvent and adding a clarifying JSDoc comment (less effective for IDE autocomplete and code reading)
- **Trade-offs:** Small refactoring effort in crdt-sync-service and exports; caught by TypeScript at compile time so no runtime risk
- **Breaking if changed:** External consumers of the exported CrdtSyncWireMessage type must update imports (hard breaking change at type boundary)

### Preserved PROTO_HIVE_INSTANCE_ID env var with semantic redirect: now sets protolab.instanceId instead of hive.instanceId. No removal of the env var. (2026-03-12)

- **Context:** Env var still referenced in deployments/scripts; removing it would break existing workflows
- **Why:** Backward compatibility with production deployments that set PROTO_HIVE_INSTANCE_ID; maintains external contracts while internally consolidating identity resolution
- **Rejected:** Remove env var entirely (breaks existing deployments); add parallel env var (confusing, multiple sources of truth)
- **Trade-offs:** Easier upgrade path for existing deployments; adds one indirect mapping in applyEnvOverrides() but self-documents intent
- **Breaking if changed:** If code checks specifically for hive.instanceId being set, it will see undefined; but if code just reads instanceId from anywhere, the env var still works via protolab

### Unauthenticated observability endpoints (health, logs, metrics) should be registered before auth middleware within the main router (createHealthRoutes), not as separate unprotected routes, to keep semantically-related endpoints colocated (2026-03-12)

- **Context:** MCP tool needs to call /api/health/log-path without credentials for debugging when auth might be broken; needed to decide placement within routing structure
- **Why:** Observability must work even when auth is broken (you need to read logs to debug auth problems); createHealthRoutes() is semantically correct place for system-level endpoints; keeps health-related logic together
- **Rejected:** Could create separate /api/unauth/ prefix (less semantic, splits system concerns); could require auth (defeats purpose of log-reading tool for debugging)
- **Trade-offs:** Unauthenticated endpoints expand attack surface slightly, but gain is significant (self-diagnostics always work); middleware ordering becomes important implementation detail
- **Breaking if changed:** If someone adds auth middleware before health route registration, tool breaks even when server is up

#### [Gotcha] Must use events.broadcast() not events.emit() to trigger remote sync via event bridge (2026-03-12)

- **Situation:** Categories route broadcasts 'categories:updated' to trigger local file write AND cross-instance propagation
- **Root cause:** setRemoteBroadcaster only intercepts broadcast() calls; emit() would only trigger local listeners and skip remote forwarding
- **How to avoid:** broadcast() adds indirection/naming confusion; gained deterministic remote propagation without explicit socket code

#### [Pattern] Callback injection pattern: functions accept optional callback types (MemoryStatsCrdtWriter, MemoryStatsAggregateReader) instead of requiring CRDT store injection. Existing callers work unchanged; new callers opt-in. (2026-03-12)

- **Problem solved:** Adding CRDT tracking to memory-loader utilities without breaking existing code paths. Need backwards compatibility in monorepo with many call sites.
- **Why this works:** Gradual adoption: callers like auto-mode-service can pass callbacks when available; other callers (existing, or those without CRDT context) don't pass them. No big-bang refactoring.
- **Trade-offs:** Optional callbacks: low friction adoption vs caller must know to pass them to get CRDT benefit. Type-safe callback params vs implicit dependency.


#### [Gotcha] getResearchMdPath duplicates getResearchFilePath functionality — both return identical path (.automaker/projects/{slug}/research.md). Two functions, one return value. (2026-03-13)
- **Situation:** Added getResearchMdPath as a 'more descriptive name' for research path access, but identical function already exists as getResearchFilePath.
- **Root cause:** Unclear naming convention or API design — suggests ambiguity about which function callers should use going forward.
- **How to avoid:** Easier to find via both names (discoverability) but harder to maintain — both must be updated if path convention changes. Creates decision fatigue for API consumers.

#### [Gotcha] Research route must be registered BEFORE the lifecycle sub-router in Express. Registering after the sub-router causes Express to match the sub-router first and the specific route never executes. (2026-03-13)
- **Situation:** Express matches routes in registration order. Sub-routers like /lifecycle catch all /lifecycle/* requests if registered first.
- **Root cause:** Express routing is sequential. More specific routes must come before less specific ones (sub-routers). Reverse order means POST /lifecycle/research gets caught by router.use('/lifecycle', ...) handler.
- **How to avoid:** Easier: clear route priority. Harder: route registration order becomes a hidden dependency.

#### [Pattern] Establish projectSlug as the canonical key for locating project-scoped research artifacts (2026-03-13)
- **Problem solved:** Research.md lookup gated on feature.projectSlug existence; path resolution via getResearchFilePath(projectPath, projectSlug)
- **Why this works:** Creates a simple 1:1 convention for artifact discovery; avoids ID-based lookups or dynamic path resolution
- **Trade-offs:** Slug-based is human-readable and versioning-stable, but assumes research always co-located with project; refactoring if research moves to centralized store

#### [Gotcha] POST /api/projects/lifecycle/initiate returns localSlug (not project.slug) for post-creation navigation. Returns field name is non-intuitive. (2026-03-13)
- **Situation:** Navigation after project creation requires the new project's path. Endpoint documentation/naming unclear about return value.
- **Root cause:** Server-side design choice - localSlug is auto-generated from title. Full project slug may not be available yet or requires additional processing.
- **How to avoid:** Gain: unique URL-safe identifier immediately available. Loss: developer must discover localSlug vs slug distinction.

#### [Pattern] Event enrichment pattern: TimelineEvent interface extended with optional ceremony-specific fields (`ceremonyLabel?`, `artifactUrl?`) rather than creating separate ceremony event type. (2026-03-13)
- **Problem solved:** Need to add ceremony-specific metadata (labels, artifact URLs) to timeline events without fragmenting event type system.
- **Why this works:** Single TimelineEvent type for all timeline entries. Optional fields make it extensible for future enrichment without creating subtype explosion.
- **Trade-offs:** TimelineEvent becomes less semantically pure but more pragmatic. UI must handle optional fields, but avoids discriminated union complexity.

#### [Gotcha] Service method getResolvedCapabilities() has an undocumented constraint: it only searches the project manifest. Its name suggests it 'resolves' all agent capabilities, but internally calls getAgent() which has this manifest-only limitation. (2026-03-13)
- **Situation:** Caller at route layer assumed the method would return capabilities for any agent that listAgents() could find, but that assumption violated for synthetic agents.
- **Root cause:** Method naming is optimistic ('Resolved') without surfacing the implementation detail of what sources it searches. No type or error signal distinguishes manifest hits from manifest misses.
- **How to avoid:** Current approach has simpler signature but hides important contract details. Explicit approach would be noisier but prevent assumptions about coverage.

### Made _builtIn an optional, API-layer-only field on ProjectAgent type. Never appears in user-authored manifests. Explicitly documented in JSDoc. (2026-03-13)
- **Context:** Need to track whether an agent is built-in (system-provided) vs. user-defined, but this should not be an editable field in user manifests.
- **Why:** Separates concerns: type documents reality and responsibility boundary. API layer is responsible for populating this flag when returning built-in agents. Users should never attempt to set this field. Using an optional field signals 'computed by API, not by user'.
- **Rejected:** Making it required or allowing it in user manifests would blur the line between 'what the system considers built-in' (API responsibility) and 'what the user claims is built-in' (user action). Rejected putting it in manifest parsing logic.
- **Trade-offs:** Optional field means implicit contract that API must set it; no compile-time enforcement. Gains clarity about responsibility boundaries at cost of runtime discipline.
- **Breaking if changed:** If this field is removed, the type loses ability to explicitly track built-in status at the API boundary. Code would revert to unsafe casts like 'as unknown as ProjectAgent[]' to satisfy the type system.

### Exposed confidence as a sibling field to agent in API response ({agent, confidence}) instead of nesting it (agent.confidence or {agent: {..., confidence}}). (2026-03-13)
- **Context:** The routes/agents.ts endpoint needed to reflect the new MatchResult structure when returning the match result to clients.
- **Why:** Flat structure makes confidence discoverable in API schema documentation and easier for clients to destructure. Separating agent and confidence fields mirrors the internal MatchResult type structure, reducing impedance mismatch.
- **Rejected:** Nested under agent object (agent.confidence) - couples confidence lifecycle to agent object, harder to version separately. Alternative: confidence as optional field on agent at call-site (agent?.confidence ?? null) - less explicit about what changed in the API.
- **Trade-offs:** Slightly flatter API surface (one more top-level field), but clearer separation of concerns between agent identity and quality metric.
- **Breaking if changed:** Clients expecting agent to be a bare ProjectAgent object with no confidence field will work (no field removed), but new clients expect separate confidence field to exist.

### Month filtering uses query parameter (YYYY-MM format) rather than path parameter for summary endpoint (2026-03-15)
- **Context:** GET /summary?month=2026-03 vs GET /summary/2026-03
- **Why:** Query parameters are conventional for filters/options in REST; allows optional queries in future (e.g., ?month=2026-03&categoryId=foo) without explosion of path routes
- **Rejected:** Path parameter - would require separate routes for each granularity (day, week, month, quarter)
- **Trade-offs:** Query params require validation logic in handler (YYYY-MM regex); path params are validated by routing. Query approach is more flexible but less 'clean' REST
- **Breaking if changed:** Clients expecting /summary/2026-03 path format would break. Changing to optional query breaks existing ?month= contract

#### [Pattern] Uniform response envelope format (success flag + data/error) duplicates HTTP status code semantics (2026-03-15)
- **Problem solved:** Every response: { success: true, data: {...} } or { success: false, error: '...' }, paired with HTTP 200/400/500
- **Why this works:** Client-side convenience - single property check for success (response.success) vs parsing status codes. Language-agnostic, works through proxies that hide HTTP status. Explicit error message without parsing body
- **Trade-offs:** Redundancy (status + success flag) adds bytes but improves developer experience. Clients can't rely on status alone; must check both. Creates implicit contract client must follow

### Explicit DEFAULT_AGENT_SYSTEM_PROMPT reframes agent purpose from code-writing to research-and-recommendations for home tasks (2026-03-15)
- **Context:** Without explicit framing, agents default to implementation mode; 'research best thermostat' would yield code instead of options
- **Why:** Home management domain requires research/decision-support more than implementation; must override implicit code-writing bias
- **Rejected:** Relying on task description alone to convey research intent - insufficient for LLM behavior steering
- **Trade-offs:** Explicit framing reduces ambiguity but makes prompt more domain-specific; less generic/reusable
- **Breaking if changed:** Removing or weakening the 'research vs implement' framing causes agents to write code for research tasks

### Type coercion in PATCH updates: each optional field explicitly checked with typeof/Array.isArray before assignment, converting mistyped values to null rather than rejecting (2026-03-15)
- **Context:** Partial updates need to distinguish between 'field not provided' (undefined) vs 'field cleared' (null) vs 'field set' (value)
- **Why:** Allows clients to explicitly clear fields by sending correct type, but prevents invalid types from corrupting data by setting to null instead of rejecting
- **Rejected:** Could reject mistyped updates entirely with 400 error, or allow any type and coerce client-side
- **Trade-offs:** More lenient API (easier client integration) but silent type coercion could mask client bugs; verbose but type-safe
- **Breaking if changed:** If code later assumes non-null string fields always contain valid strings, null values from type mismatches will cause failures

#### [Gotcha] Error routing based on error.message.includes('not found') is fragile - depends on exact error message text from service layer (2026-03-15)
- **Situation:** DELETE and GET endpoints check error message string to return 404 vs 500
- **Root cause:** Avoids creating custom error types, reuses existing exception pattern
- **How to avoid:** Simpler code but brittle - message changes break error handling without compile-time detection

#### [Pattern] Full-text search across unstructured fields (name, manufacturer, model, serialNumber, location, notes) vs. structured filter endpoints (2026-03-15)
- **Problem solved:** GET /search?q=X searches multiple fields; GET / accepts category/location/warrantyExpiring filters
- **Why this works:** Users don't know which field to search (Is it in notes? manufacturer? model?), so full-text is more discoverable; structured filters for common queries
- **Trade-offs:** Dual approach more powerful but increases API surface; full-text on notes field may return irrelevant results from unstructured text

### sensorIds and photoUrls stored as arrays of strings (references) without validation that IDs/URLs actually exist (2026-03-15)
- **Context:** Assets can reference sensors and photos but service doesn't verify references resolve
- **Why:** Decouples inventory from sensor/photo services (no tight coupling), allows creating assets before sensors exist, URLs can be external
- **Rejected:** Could validate IDs exist before save (requires sensor service dependency), or validate URLs are accessible
- **Trade-offs:** Simpler code and fewer dependencies but can leave dangling references; discovery of invalid references only happens when consumed
- **Breaking if changed:** If referenced sensor is deleted, inventory still holds stale ID; photo URL could return 404 at display time

### Total value report returns aggregation by category (sum replacementCost per AssetCategory), not by location or other dimensions (2026-03-15)
- **Context:** GET /total-value response groups by category only
- **Why:** Insurance/budgeting typically organized by asset type (kitchen, bedroom, electronics) not location; category is the primary dimension
- **Rejected:** Could aggregate by location (room-by-room value), or both dimensions, or user-configurable
- **Trade-offs:** Simpler response but limited to single dimension; location info must be parsed from asset list separately
- **Breaking if changed:** If user needs value breakdown by location, they must implement client-side grouping of individual assets

#### [Gotcha] Error detection in route handlers uses error.message.includes('not found') string matching, creating tight coupling between route and service error messages (2026-03-15)
- **Situation:** All delete and complete route handlers check: if (message.includes('not found')) → 404; else → 500
- **Root cause:** Quick error classification without formal error types; avoids try-catch per error type
- **How to avoid:** Simpler initial code but brittle; if service changes error message wording, routes fail silently; error classification spreads across codebase

#### [Pattern] Filter-based list endpoint (GET /maintenance with ?category=, ?assetId=, ?upcoming=, ?overdue=) coexists with purpose-specific endpoints (/upcoming?days=30, /overdue, /summary) (2026-03-15)
- **Problem solved:** GET /maintenance accepts filters; GET /upcoming?days=30 specialized for time window; GET /overdue simplified query
- **Why this works:** Generic filtering for power users; specialized endpoints for common UI patterns (dashboard summaries); both serve different client needs
- **Trade-offs:** More endpoints to maintain but clearer intent; clients can choose simple vs flexible queries; some parameter duplication possible

### POST /:scheduleId/complete creates new MaintenanceCompletion record and advances nextDueAt by intervalDays (not by days since schedule creation) (2026-03-15)
- **Context:** Completion handler recalculates nextDueAt = lastCompletedAt + intervalDays; supports optional completedAt parameter
- **Why:** Interval scheduling semantics: 'every 30 days' means 30 days from last completion, not from original creation; prevents drift over time if completions delayed
- **Rejected:** nextDueAt = now() + intervalDays (resets schedule clock); nextDueAt = createdAt + (completions.length + 1) * intervalDays (arithmetic interval)
- **Trade-offs:** Correct interval semantics but requires completedAt tracking; prevents schedule drift but means missed completions don't cascade overdue dates
- **Breaking if changed:** Changing to now()+interval semantics would shift all future schedules; changing to arithmetic would break recurring schedules that slip

#### [Pattern] Graceful fallback UI ('No linked sensors') when asset has sensorIds but /api/sensors returns no matching data, per deviation rules (2026-03-15)
- **Problem solved:** Sensor readings feature depends on sensors existing; data inconsistency is possible if sensor deleted after asset created
- **Why this works:** Shows empty state rather than error, assuming temporary data inconsistency rather than true failure; user can still see asset
- **Trade-offs:** Graceful degradation improves UX but masks data inconsistencies that might indicate sync bugs; easier to implement than orphan resolution

#### [Gotcha] Return type inconsistency: `complete()` returns `{schedule, completion}` object pair, but `update()` returns null on missing record, and `delete()` returns boolean. (2026-03-15)
- **Situation:** Different CRUD methods had different error handling philosophies
- **Root cause:** complete() needs both objects to respond meaningfully to client. update()/delete() opted for nullable/boolean returns instead of throwing, assuming caller checks return value.
- **How to avoid:** Nullable returns are lighter-weight but require caller discipline to check. Throwing would be safer but noisier. Inconsistency makes API harder to reason about.

#### [Pattern] Merge conflict resolved by placing both services in ServiceContainer and both route mounts in order: inventory first, then maintenance. Order is deterministic and intentional. (2026-03-15)
- **Problem solved:** Two features developed in parallel branches both needed to integrate into same ServiceContainer and route registration
- **Why this works:** Order matters for logging (each prints mount message). Consistent ordering in exports prevents merge surprises on next conflict. Alphabetical order (inventory, maintenance) is arbitrary but stable.
- **Trade-offs:** Creates an implicit ordering rule; developers must remember not to reorder arbitrarily. Single source of truth is stable.

### Event emission threshold changed from any-change to 2+ point delta; pillarHints limited to max 3 items (2026-03-15)
- **Context:** Preventing event spam and UX overwhelm from detailed suggestions
- **Why:** 1-point fluctuations are noise (rounding, minor data changes). 2+ threshold meaningful to user. 3 suggestions is cognitive load limit (HCI principle). Larger delta = worthy of event/notification
- **Rejected:** Emit on any change (causes spam); unlimited pillarHints (UX overwhelm)
- **Trade-offs:** Users miss small score updates (good) but get focused, actionable suggestions. Prevents notification fatigue
- **Breaking if changed:** Removing threshold re-introduces cascade events; >3 pillarHints would dilute UX priority signals

#### [Pattern] WebSocket event-driven React Query cache invalidation for real-time gamification data sync (2026-03-15)
- **Problem solved:** useGamificationEventSync hook listens to WebSocket events to invalidate React Query cache across multiple gamification queries
- **Why this works:** Keeps profile view, dashboard widget, and sidebar XP all in sync without component-to-component event passing. WebSocket events are authoritative trigger for cache invalidation
- **Trade-offs:** Requires WebSocket infrastructure and event naming contract, but eliminates need for shared state management library or context providers for gamification data

#### [Pattern] Asymmetric XP rewards based on event conditions encode behavioral policy: maintenance on-time=50 vs late=25, inventory with-photo=25 vs without=15, budget under-target=100 or zero (2026-03-15)
- **Problem solved:** Gamification system needs to incentivize specific user behaviors across different domains
- **Why this works:** Different reward amounts directly encode which behaviors are encouraged; this is explicit policy, not just data variation
- **Trade-offs:** Clear behavioral intent vs more complex reward logic; harder to change (changes are behavioral not config); easier to analyze user incentives

### Budget API uses GET with query params (?month=YYYY-MM) rather than POST with request body (2026-03-15)
- **Context:** Fetching transactions for a specific month requires passing the month parameter to the backend
- **Why:** GET + query params enables URL bookmarking, browser caching (if headers allow), shareable URLs, and follows REST conventions for read operations. Confirmed from transactions.ts route pattern.
- **Rejected:** POST with month in body (loses cacheability, non-standard for reads); client-side filtering after fetching all data (expensive, doesn't scale)
- **Trade-offs:** RESTful and cacheable but query params limit filtering complexity - would need multiple params or POST for complex filter sets
- **Breaking if changed:** If changed to POST, URL bookmarking and browser caching stop working; users can't share a specific month's budget view

#### [Pattern] List endpoint returns secret metadata without decrypted values; single-item GET endpoint returns full object with decrypted value. Two response shapes for same resource type. (2026-03-15)
- **Problem solved:** Vault needs both bulk listing capability and individual secret retrieval, but listing thousands of secrets with full decryption is expensive.
- **Why this works:** Performance: avoid decrypting all secrets when client only needs to browse/search. Selective exposure: clients never receive all plaintext in one response.
- **Trade-offs:** Clients must handle two different response schemas and make additional requests for values, but prevents thundering herd of decryption operations and reduces data exposure surface

### Used apiFetch('PATCH') directly instead of creating missing apiPatch helper (2026-03-15)
- **Context:** PATCH mutation for vendor updates - no apiPatch helper existed in api-fetch.ts
- **Why:** Pragmatic unblocking - adding new helper introduces decision paralysis and potential duplication if others implement differently
- **Rejected:** Create apiPatch helper for consistency with get/post pattern and future maintainability
- **Trade-offs:** Faster implementation vs inconsistent API surface; if apiPatch is later added, this code becomes odd duck
- **Breaking if changed:** If codebase standardizes on apiPatch helper pattern, this code diverges from convention. If someone later adds apiPatch, redundancy question arises.

### Detail panel shows linked asset IDs only, not fetched asset names - deferred asset name loading as follow-on enhancement (2026-03-15)
- **Context:** vendor-detail-panel displays list of linked asset IDs; full asset names available but would require additional API call per vendor
- **Why:** Pragmatic N+1 avoidance; vendor endpoint likely already includes asset_ids in payload. Fetching names requires separate inventory API call, adds latency and complexity
- **Rejected:** Fetch asset names eagerly (extra API call), include asset names in vendor response (API design change), show asset names in separate enrichment step (component complexity)
- **Trade-offs:** Simpler immediate implementation, lower API load vs UX debt (users see IDs without context); acceptable for internal tools but poor for customer-facing
- **Breaking if changed:** If linked assets become prominent (customers asking 'which assets?'), showing IDs becomes friction point requiring redesign to include asset names.

#### [Gotcha] Sensor history routes mounted BEFORE /:id catch-all to avoid parameter conflicts (2026-03-15)
- **Situation:** Both /sensors/:id/history and /sensors/:id exist; without correct order, :id route matches first and prevents history endpoint from being hit
- **Root cause:** Express/fastify route matching is first-match-wins. More specific routes must be registered before catch-all patterns.
- **How to avoid:** Explicit route ordering is fragile but required; documentation or linting rules would help prevent regression

#### [Pattern] History endpoint includes limit parameter for pagination; prevents unbounded queries (2026-03-15)
- **Problem solved:** getHistory() returns paginated results; client must explicitly request number of readings
- **Why this works:** Protects against memory exhaustion and slow queries when someone queries 10 years of data. Explicit pagination limits encourage responsible API usage.
- **Trade-offs:** Client must handle pagination logic vs. protection from query bombs

#### [Pattern] Response shape validation pattern: each mutation checks `if (!result?.success)` before returning data, wrapping API contract enforcement in the hook (2026-03-15)
- **Problem solved:** All three mutation hooks validate API response has success flag before extracting data
- **Why this works:** Enforces API contract at consumption point. Prevents downstream code from receiving undefined/null data if API contract changes. Centralizes error narrative.
- **Trade-offs:** Verbosity in each mutation hook vs robustness; moves error responsibility to hook author not consumer

#### [Gotcha] Inconsistent API client helper usage: apiPost for create, apiFetch for update, apiDelete for delete—suggests different interfaces/signatures per operation type (2026-03-15)
- **Situation:** Three mutations use three different fetch wrappers despite doing similar work (POST/PATCH/DELETE HTTP operations)
- **Root cause:** Likely historical—wrappers may have evolved or have different response handling (e.g., delete returns empty, others return data). Different helpers for different concerns.
- **How to avoid:** More helpers to understand vs semantically clear intent (apiDelete is explicit); harder to refactor if helpers need changes

#### [Pattern] Service injection for Ava tools: `inventoryService`, `vendorService`, `maintenanceService` passed as dependencies to `buildAvaTools()` rather than imported as globals (2026-03-15)
- **Problem solved:** Registering tools that need to query multiple service layers (inventory, vendors, maintenance schedules)
- **Why this works:** Enables test mocking, keeps tools decoupled from service discovery, makes tool availability conditional on service existence. Services optional at registration time.
- **Trade-offs:** More dependency injection boilerplate in chat/index.ts (3 lines added) but gains modularity and testability

### Ava tools are primarily read-only query tools; only `complete_maintenance()` performs writes, delegating to existing service methods rather than duplicating business logic (2026-03-15)
- **Context:** Designing 9 new tools for Ava assistant to query home management data and allow limited writes (marking maintenance complete)
- **Why:** Keeps data consistency in one place (service layer), avoids duplicating validation/sequencing logic, reduces bug surface for writes. Ava assistant as query tool, not data mutator.
- **Rejected:** Scattered write operations across multiple tools (e.g., `update_asset`, `reschedule_maintenance`, `add_vendor_note`) would duplicate business rules and risk inconsistency
- **Trade-offs:** Limited Ava functionality but higher data integrity. Ava assistant becomes a smart query interface, not a full CRUD interface.
- **Breaking if changed:** If Ava tools expand to multiple write operations, would need centralized transaction coordination and rollback logic, increasing complexity significantly

### Two separate Ava tools (get_active_quests, suggest_quest) rather than single 'manage_quests' tool with sub-operations. (2026-03-15)
- **Context:** Ava chat interface exposes get_active_quests (passive list) and suggest_quest (active generation) as distinct callable tools.
- **Why:** Separation mirrors common query patterns (what can I work on now? vs. what should I work on?). Each tool has singular purpose, simpler documentation and invocation. Suggest_quest can have expensive logic (full state evaluation) vs. cheap get_active_quests (simple DB select).
- **Rejected:** Single 'manage_quests' tool with operation parameter (e.g., {op: 'list' | 'suggest'}).
- **Trade-offs:** More tool entries in UI but clearer semantics. Cost: each needs separate documentation; benefit: tool naming is self-documenting.
- **Breaking if changed:** Combining into one tool makes operation discovery harder for LLM; tool invocation becomes more complex.

### Payload validation deferred to mutation handler - textarea accepts any text, JSON.parse called during submit, not edit (2026-03-15)
- **Context:** Dialog accepts freeform JSON payload; validation happens at send-time, not input-time
- **Why:** Supports flexible payload schemas; no need to predefined structure in schema; allows copy-paste workflow
- **Rejected:** Schema-driven validation with form fields - forces rigid structure; editor-like approach with JSON Schema UI
- **Trade-offs:** Flexibility gained; poor error UX - users get parse errors after clicking Send, no IDE hints during editing
- **Breaking if changed:** If schema validation added later, requires UI redesign; currently any malformed JSON silently fails on backend

### Asymmetric API authentication: register endpoint requires no auth, report endpoint requires API_KEY as Bearer token (2026-03-15)
- **Context:** Integrating Home Assistant sensors with IoT device data in a multi-source system
- **Why:** Lower friction for initial sensor registration and setup, but protect the data ingestion pathway where credentials matter
- **Rejected:** Requiring auth on both endpoints would complicate initial setup; no auth on report endpoint would expose data ingestion
- **Trade-offs:** Registration is discoverable/easy but data is protected; asymmetry requires users to understand security boundary
- **Breaking if changed:** Changing to symmetric auth or adding auth to register breaks deployment scripts; removing auth from report exposes the system

### Merge strategy settings (allow_squash_merge, allow_merge_commit, allow_rebase_merge) require separate PATCH /repos endpoint call; they cannot be set via the branch protection endpoint (2026-03-15)
- **Context:** Initial approach attempted to configure all settings in a single API call to the branch protection endpoint
- **Why:** GitHub API architecture separates repository-level policies from branch-specific protection rules as distinct resources
- **Rejected:** Single combined call would silently fail to apply merge settings while leaving branch protection partially configured
- **Trade-offs:** Two API calls instead of one, but each is independently testable and idempotent with clearer failure semantics
- **Breaking if changed:** Merge strategy enforcement won't apply if only the branch protection endpoint is called