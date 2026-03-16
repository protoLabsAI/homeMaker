---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 3
  referenced: 3
  successfulFeatures: 3
---
# architecture

#### [Gotcha] Initialization order dependency: SensorRegistryService requires homemakerDb singleton instantiated earlier (line 442 vs line 762), forcing reordering of unrelated initialization code (2026-03-15)
- **Situation:** Constructor-injected dependencies are evaluated at service creation time; reordering services requires moving singleton instantiation
- **Root cause:** Reveals hidden service graph dependencies; hoisting singleton earlier makes dependency chain visible but couples services to initialization order
- **How to avoid:** Clear dependency ordering (easier to trace) but fragile to refactoring; adding new early-dependent services requires careful sequencing

#### [Pattern] Optional dependency injection with graceful degradation: `db?: BetterSqlite3.Database` parameter with try-catch allows service to function in both persisted and in-memory modes (2026-03-15)
- **Problem solved:** Service needs to work in testing/development (no DB) and production (with persistence) without separate implementations
- **Why this works:** Reduces deployment complexity and test setup burden; in-memory reads remain functional if DB fails, providing resilience
- **Trade-offs:** Simpler testing and partial-failure handling (service stays alive) vs harder state consistency reasoning and silent data loss on DB exceptions

### VendorDetailPanel uses direct apiFetch for mutations (PATCH/DELETE) rather than React Query hooks from useVendors, despite Storybook decorator including withQueryClientDecorator (2026-03-15)
- **Context:** Needed mutation handlers in detail panel while keeping component decoupled from query client
- **Why:** Component receives onClose/onDeleted callbacks from parent; direct API calls keep component simple and avoid tight coupling to global query state. Decorator is defensive but not required.
- **Rejected:** Could have used useVendors mutations inside detail panel, but would require parent to pass query client context or refactor callback pattern
- **Trade-offs:** Direct apiFetch is simpler for this panel-in-sheet scenario; trade-off is loss of query client's automatic refetch integration (handled by parent callback instead)
- **Breaking if changed:** Refactoring to useVendors mutations would require changing callback contract and parent coordination logic

#### [Pattern] useVendors hook follows useInventory pattern: fetch on mount, provide createVendor/updateVendor/deleteVendor mutations with automatic refetch on success (2026-03-15)
- **Problem solved:** Multiple domain models (Vendor, Inventory, etc.) need consistent CRUD hook interface across codebase
- **Why this works:** Pattern consistency reduces cognitive load and makes hook behavior predictable; establishing a template for future domain hooks
- **Trade-offs:** Slight code duplication across similar hooks vs flexibility to diverge per-domain logic later

### Entity IDs are prefixed with 'ha:' namespace (e.g., 'ha:light.living_room') when registered as homeMaker sensors. This creates a separate namespace from other sensor types. (2026-03-15)
- **Context:** HA entities need to coexist with other sensor types in homeMaker's sensor registry without collisions
- **Why:** Prevents ID collisions if another integration (e.g., local sensors, other services) uses the same entity names. Provides clear provenance and allows type-based filtering of sensors.
- **Rejected:** Could register without prefix, but would require collision detection and handling at registration time; prefix approach is simpler and more declarative
- **Trade-offs:** Requires downstream code to understand the 'ha:' prefix convention, but provides clear separation and type identification. Downside: developers must remember to include prefix when querying HA sensors.
- **Breaking if changed:** Changing the prefix (e.g., to 'homeassistant:') would break all code and queries that depend on the 'ha:' namespace identifier

### HA connection test implemented server-side via proxy endpoints (/api/ha/test) instead of browser-side direct calls to HA REST API (2026-03-15)
- **Context:** Local Home Assistant instances do not have CORS headers configured for browser requests from arbitrary origins
- **Why:** Server-to-server backend calls bypass CORS restrictions. Browser-side calls would fail with CORS errors on typical Home Assistant setups running on localhost/private networks.
- **Rejected:** Browser-side direct HTTP calls to user's HA REST API endpoint
- **Trade-offs:** Adds backend route overhead but eliminates a hard blocker for users. Without this, feature is unusable for standard HA installations.
- **Breaking if changed:** Reverting to browser-side calls causes CORS errors on local HA instances - feature becomes non-functional for typical user deployments.

### Dual-mode Home Assistant integration: Direct WebSocket (pull) vs Push via REST (2026-03-15)
- **Context:** Supporting different deployment scenarios - some users can reach HA directly, others face firewall/reverse-proxy restrictions
- **Why:** Maximizes user base by accommodating network topology constraints without forcing workarounds
- **Rejected:** Single integration mode would exclude users with restricted network access
- **Trade-offs:** More documentation and code paths to maintain, but enables zero-configuration setup for most users (WebSocket recommended)
- **Breaking if changed:** Removing either approach loses support for entire deployment scenarios

#### [Pattern] Entity namespace convention: all Home Assistant entities prefixed with 'ha:' to distinguish from directly-registered IoT devices (2026-03-15)
- **Problem solved:** homeMaker supports multiple entity sources; namespace collision possible without prefix
- **Why this works:** Makes entity origin immediately visible in UI/config; prevents accidental confusion between data sources
- **Trade-offs:** Adds 3-4 chars to entity names, but eliminates ambiguity about entity provenance

#### [Pattern] Auto-generated VitePress sidebar from docs/modules/ directory structure eliminates manual nav maintenance (2026-03-15)
- **Problem solved:** Calendar module was fully implemented but had zero documentation; new docs created but nav updates needed
- **Why this works:** Creating docs/modules/calendar.md automatically adds to nav without editing sidebar config
- **Trade-offs:** Directory structure becomes part of API contract, but documentation scaling is O(1)

#### [Gotcha] Dialog default state must be set in BOTH useEffect (on open) AND resetForm callback to ensure consistency across different UI flows (2026-03-16)
- **Situation:** Setting featureType default to 'research' only in one location led to inconsistent behavior depending on whether user triggered form reset vs. reopening dialog
- **Root cause:** Dialog state management has multiple entry points; useEffect handles mounting/reopening, but explicit reset needs its own initialization to avoid stale state
- **How to avoid:** More boilerplate (repeating defaults in 2 places) but guarantees consistency; centralizing in one place is cleaner but fragile

### Extended existing featureType union ('code' | 'content' → 'code' | 'content' | 'research') rather than creating separate ResearchTask concept (2026-03-16)
- **Context:** Could have created ResearchTask as parallel abstraction or created it as featureType variant
- **Why:** featureType already provides discriminated board task behavior (status tracking, assignment, scheduling) — reusing it avoids duplicating task infrastructure and keeps one unified board model
- **Rejected:** Separate ResearchTask model — would require parallel components, state machines, and API routes; duplication of board task lifecycle management
- **Trade-offs:** Faster to implement with existing infrastructure; slight semantic looseness (research tasks are treated identically to code tasks by the system)
- **Breaking if changed:** If featureType is ever removed or refactored, research tasks lose their place in the task system entirely; the union extension is the glue holding research into the board model

### Prompt explicitly states 'no code, no file writes, no commits' as guardrails rather than relying on tool availability to enforce boundaries (2026-03-16)
- **Context:** Agent has no code execution tools, so technically can't write code — but prompt still explicitly forbids it
- **Why:** Dual enforcement: tools prevent accidental capability, prompt prevents LLM from requesting forbidden capabilities or suggesting user workarounds
- **Rejected:** Relying solely on tool selection to enforce guardrails — LLM might still try to suggest code snippets or request code execution, confusing users
- **Trade-offs:** Explicit constraints in prompt are clear but add prompt length; relying only on tools is simpler but leaves UX ambiguous
- **Breaking if changed:** If prompt is removed or ignored, agent loses explicit boundary communication to user even though tools prevent execution

#### [Gotcha] Server build has pre-existing TypeScript errors (middleware.ts, sensor-registry-service.ts) unrelated to this change; packages build passes cleanly (2026-03-16)
- **Situation:** Running 'npm run build:server' reports errors but 'npm run build:packages' succeeds; unclear if server errors block deployment
- **Root cause:** Architecture separates packages (libs) from server app; errors in server app don't block package publishing but indicate inconsistent local build state
- **How to avoid:** Can deploy feature safely, but leaves codebase with broken server build warning locally; indicates CI/build process may not be enforcing consistency

#### [Pattern] View components used dual file+directory pattern: `docs-view.tsx` (barrel export) alongside `docs-view/` (implementation directory). Both must be deleted together during cleanup. (2026-03-16)
- **Problem solved:** Removing orphaned view components; discovered multiple views had both a top-level .tsx file and a same-named subdirectory
- **Why this works:** Separates public API (barrel export at component level) from implementation details (nested files in subdirectory). Allows clean imports while hiding complexity.
- **Trade-offs:** Cleaner import surface at cost of dual cleanup requirement; easier to navigate codebase but more files to track

### Identified orphaned components through route graph analysis (routes no longer reference them), not through direct import search. Verified no active routes reached these 6 views before deletion. (2026-03-16)
- **Context:** Phase 1 removed routes; Phase 2 needed to identify which view components were now unreachable and safe to delete
- **Why:** Route-based orphan detection is more reliable than import search. A component can have lazy imports and be syntactically reachable but semantically orphaned if no route instantiates it.
- **Rejected:** Import search alone (would miss components with imports but no route consumers; would require analyzing all call sites)
- **Trade-offs:** Requires understanding route structure and maintaining accurate route->component mapping, but guarantees safe deletions; prevents accidental removal of components that might be instantiated programmatically
- **Breaking if changed:** If routes are restored (e.g., feature re-enabled), the deleted view components won't exist. Route->component mapping becomes source of truth for which views must exist.

#### [Gotcha] Lazy-loaded components carry import infrastructure (lazy(), Suspense, Spinner fallback) that becomes dead code once the component is deleted. Must clean up entire import chain, not just the component reference. (2026-03-16)
- **Situation:** `GitHubIssuesView` was lazy-imported in ProjectsView with Suspense boundary; deleting the view also required removing lazy, Suspense, CircleDot icon, and Spinner imports that were only used for that tab
- **Root cause:** Lazy loading is an optimization pattern that creates local infrastructure. Removing the lazy component doesn't automatically cascade cleanup of supporting imports.
- **How to avoid:** Had to manually remove 4 additional imports and code blocks. More thorough cleanup but required understanding the lazy-loading pattern to identify all cleanup points.

### Distinguished between view components (safe to delete if routes don't reach them) and shared utilities/hooks (require deeper analysis). Left `useProjectSettingsLoader` untouched despite being in the same module as deleted `project-settings-view`. (2026-03-16)
- **Context:** Cleanup could have removed the entire `project-settings` module or just the view component; chose to preserve the data-loading hook
- **Why:** Hooks are typically reusable infrastructure that may be called from other contexts (other routes, data loaders, parent components). Deleting a hook requires verifying all call sites. View components are safer to delete once routes are removed.
- **Rejected:** Module-wide deletion (faster but risks breaking untraced dependencies; assumes hook is only used by the view component)
- **Trade-offs:** More conservative cleanup requires more analysis but reduces risk of breaking hidden dependencies; hooks stay available for potential future reuse
- **Breaking if changed:** If the hook is actually used elsewhere and we delete it, other code breaks. If the view component is needed again, the hook infrastructure is still there to rebuild with.

### Kept underlying status IDs unchanged (backlog, review, blocked) while changing only display titles (To Do, In Review, On Hold) (2026-03-16)
- **Context:** Needed to present home-friendly board column names without breaking existing API and data contracts
- **Why:** Separates presentation from data model, avoids backend migration, maintains backwards compatibility with existing tasks and API clients
- **Rejected:** Could have renamed status IDs to match UI (todo, in_review, on_hold) but would require data migration and API version bump
- **Trade-offs:** Easier UI change and independent deployment, but creates semantic mismatch between code and UI—developers see 'backlog' in code but 'To Do' in UI
- **Breaking if changed:** If someone later changes the actual status IDs without coordination, API contracts break and existing task data becomes invalid

#### [Pattern] Presentation-layer-only change—no API, data model, or status ID changes required (2026-03-16)
- **Problem solved:** Rebranding board for home users required careful isolation from backend systems
- **Why this works:** Reduces implementation scope, eliminates need for database migrations or backend coordination, allows independent feature branch and deployment, minimizes risk
- **Trade-offs:** Simpler and faster to ship, but creates long-term code-UI semantic mismatch that future developers must understand

### Update display labels in UI (e.g., 'Family Chat' → 'Household') while leaving internal route IDs unchanged (e.g., 'chat-channel' stays the same) (2026-03-16)
- **Context:** Product identity rebranding from dev-studio to home-management. Could have updated both labels and internal IDs.
- **Why:** Route IDs are tightly coupled to React Router navigation logic and downstream navigation state. Changing them requires cascading refactors across all route definitions, link generation, and navigation logic. Label-only updates achieve product identity rebrand without route architecture refactor.
- **Rejected:** Update both label and internal ID (would require routing refactor across entire codebase, higher merge conflict risk, larger scope)
- **Trade-offs:** Faster product identity update without routing changes; however, requires strict separation between display labels (use-navigation.ts) and internal IDs (route definitions) to avoid confusion
- **Breaking if changed:** If code anywhere assumes the displayed label matches the route ID, or if navigation references the old label as a route identifier, those fail. Requires developers understand label and ID are decoupled.