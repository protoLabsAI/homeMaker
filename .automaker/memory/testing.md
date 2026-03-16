---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# testing

#### [Gotcha] E2E verification strategy shifted from Playwright to TypeScript type checking in worktree, as running backend + frontend servers simultaneously is not viable in isolated worktrees (2026-03-15)
- **Situation:** Could not run full Playwright E2E tests in feature worktree; needed alternative verification approach
- **Root cause:** Worktrees are isolated—spinning up both backend and frontend servers adds complexity and environment coupling outside design goals. Type safety + Storybook stories provide component-level assurance.
- **How to avoid:** Type verification is fast and local; actual end-to-end flow verification deferred to integration testing on main branch or CI

#### [Gotcha] getDueSummary.dueThisMonth counts ALL tasks within 30 days, INCLUDING those in the dueThisWeek bucket (not disjoint ranges) (2026-03-16)
- **Situation:** Initial test assertion expected dueThisMonth to exclude the weekly bucket and only count 20+ day tasks, but implementation uses AND logic on date ranges (nextDueAt >= now AND <= now+30d)
- **Root cause:** The range logic is inclusive, not bucketing. dueThisMonth={within 30 days}, dueThisWeek={within 7 days} are overlapping sets
- **How to avoid:** API is simpler (single range check) but less intuitive for callers expecting disjoint buckets

#### [Pattern] BudgetService uses mkdtempSync per test + service.close() in afterEach, vs in-memory SQLite used for other services (2026-03-16)
- **Problem solved:** BudgetService constructor takes dataDir string (filesystem-based), not a DB instance, requiring different isolation strategy than sensor/maintenance/inventory services
- **Why this works:** Services have different storage contracts. BudgetService's design expects persistent dataDir; honoring the real contract in tests ensures tests validate actual usage patterns
- **Trade-offs:** Test isolation is more heavyweight (temp dir creation/cleanup) but more realistic; tests catch issues with actual temp directory lifecycle

#### [Gotcha] Sensor state classification (active/stale/offline based on lastSeenAt TTL) is computed in-memory from a transient timestamp, not persisted state (2026-03-16)
- **Situation:** To test stale/offline transitions, directly mutate sensor.lastSeenAt on the config object returned from get(), rather than waiting for time or mocking Date
- **Root cause:** State lives only in memory during the sensor lifecycle. The get() call returns the mutable config object; mutations reflect immediately in next getState() call
- **How to avoid:** Direct mutation is brittle (couples test to internal object shape) but fast and deterministic; alternative approaches add overhead or break encapsulation differently

#### [Pattern] Per-test fresh DB + section comments organizing by method name ('// ── Method ──') reduces test navigation friction in large files (300-415 lines) (2026-03-16)
- **Problem solved:** Each test file covers 28-40 methods with 7-10 tests per method, requiring clear visual structure
- **Why this works:** beforeEach fresh DB ensures test isolation (no state leakage); section comments enable quick scanning by Ctrl+F or folding; consistent structure aids code review
- **Trade-offs:** Slight test runtime overhead (DB init per test) but negligible (<ms); much better maintainability; catches ordering-dependent bugs

### Use API-level integration tests (no UI interaction) in E2E test suite instead of Playwright UI automation (2026-03-16)
- **Context:** Critical flows require testing cross-service integration (sensor → maintenance → gamification) without UI brittleness
- **Why:** API tests isolate service contract validation from UI selector fragility; faster execution; clearer what is actually integrated
- **Rejected:** Full UI automation would require element selectors, visual state checks, and be slower to execute
- **Trade-offs:** Catches service integration bugs but misses UI-specific regressions (layout, accessibility, form interaction); requires API stability assumption
- **Breaking if changed:** If service contracts change (field names, response structure), tests fail immediately and catch the issue

#### [Pattern] Reuse existing dev servers with TEST_REUSE_SERVER=true instead of spawning test-specific instances (2026-03-16)
- **Problem solved:** E2E tests run against live dev environment on ports 8578/8579 with services already running
- **Why this works:** Eliminates test startup overhead; tests run against real integrated system; matches actual dev workflow
- **Trade-offs:** Test isolation reduced (shared state), but tests catch real integration issues; requires external dependency (running servers)

#### [Gotcha] Pre-existing TypeScript errors in unrelated files (middleware.ts, sensor-registry-service.ts) blocked full npm build, requiring scope reduction to UI-only Vite build (2026-03-16)
- **Situation:** Attempted full monorepo build during feature verification, but infrastructure issues in unrelated modules prevented completion
- **Root cause:** Pragmatic decision: UI presentation changes don't depend on those services, so building just the Vite bundle confirmed the feature worked without unblocking on separate issues
- **How to avoid:** Faster verification and unblocked feature, but reduced test coverage—didn't run full E2E or integration tests, only static source verification

#### [Gotcha] Welcome view may not always be visible on app load. Initial Playwright strategy to visually verify UI changes failed; switched to file-based verification of spec.md content + DOM source code inspection instead. (2026-03-16)
- **Situation:** Created Playwright tests expecting welcome view to be rendered at localhost:8578 to verify new home-focused taglines. Tests couldn't find target text because users with existing projects skip welcome view.
- **Root cause:** In single-user app, returning users don't see welcome view again. Assumption that landing page = welcome view is wrong for repeat users. File-based verification (checking spec.md content exists, checking HTML contains no old strings) is more reliable for product identity changes.
- **How to avoid:** File-based verification is more reliable and faster (no UI rendering), but less comprehensive about actual rendered output. Trades end-to-end UI validation for deterministic content validation.