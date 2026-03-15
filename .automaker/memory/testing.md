---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 98
  referenced: 28
  successfulFeatures: 28
---
<!-- domain: Testing Patterns | Unit test patterns, integration test strategies, test isolation -->

# testing

#### [Pattern] Test .gitignore patterns by creating actual files and running `git check-ignore`, then verify via integration test that the file appears in `git status` (2026-02-10)

- **Problem solved:** Pattern syntax errors in .gitignore are silent — git simply ignores files you intended to track, and this only surfaces when you notice git status doesn't show expected files.
- **Why this works:** .gitignore validation requires two layers: (1) syntax correctness via `git check-ignore`, (2) intent correctness via `git status`. Syntax can be right but pattern logic wrong (e.g., parent directory ignored). Only integration test proves the actual behavior.
- **Trade-offs:** Requires full integration test (create actual files, run git commands) vs cheaper unit tests. Cost is minimal for critical paths like version control rules.

#### [Gotcha] Playwright test initially failed because TypeScript compilation succeeded but dev server wasn't running new code (2026-02-10)

- **Situation:** Built code without restarting server; test ran against stale server logic.
- **Root cause:** Dev server caches compiled code in memory. Restart required to pick up new task registration.
- **How to avoid:** Dev discipline: restart after structural changes.

#### [Gotcha] Event emission tests must verify BOTH presence and ordering of events — a single check for 'health:check-completed' existing won't catch missing 'health:issue-detected' events (2026-02-12)

- **Situation:** Simple test that only verifies 'health:check-completed' exists would pass even if the 'health:issue-detected' emission was never added.
- **Root cause:** Event-driven systems are easy to test incompletely. The success of downstream behavior doesn't guarantee all intermediate events fired. Must test the event stream sequence, not just endpoints.
- **How to avoid:** More comprehensive tests = more test code, but catches off-by-one event sequence bugs that integration tests might miss.

#### [Pattern] Use event spy callbacks to capture and filter multiple event types, then verify ordering with index comparisons (2026-02-12)

- **Problem solved:** Need to verify that multiple events fire in a specific order in a single test run.
- **Why this works:** Callback spy captures full event stream with timing. Filtering by event type + index comparison is clearer than trying to count events or use timestamps.
- **Trade-offs:** More complex test (array filtering, index math) vs simpler individual event tests, but catches real bugs.

#### [Gotcha] Playwright E2E tests skipped due to existing server instance conflict — test environment assumes no running server, but dev environment typically has one running (2026-02-12)

- **Situation:** Attempted to run Playwright verification tests in development environment where server was already running on the port tests expected.
- **Root cause:** Port conflicts cause test framework to fail during setup.
- **How to avoid:** Use TEST_REUSE_SERVER env var to target already-running instance, or use isolated ports in test config.

#### [Gotcha] npm pack --dry-run outputs file list to stderr, not stdout. Test assertions on execSync output must capture both or redirect stderr to stdout with 2>&1 (2026-02-13)

- **Situation:** Initial test was checking output variable for tarball file list — found nothing because output was empty.
- **Root cause:** npm pack writes the summary/file listing to stderr by design, keeping stdout clean for piping the actual tarball.
- **How to avoid:** Use `{ stdio: ['pipe', 'pipe', 'pipe'] }` in execSync options and concatenate stderr into assertions.

#### [Gotcha] Root vitest config interferes with package-level tests in monorepo. Must create local vitest.config.ts at package level to isolate test environment. (2026-02-13)

- **Situation:** Tests in packages were inheriting root vitest configuration which had incompatible globals and environment settings.
- **Root cause:** Monorepo packages need isolated test configs. Root config may include workspace-wide settings (like globals: true) that conflict with individual package requirements.
- **How to avoid:** Each package maintains its own vitest.config.ts — slight duplication but gains isolation.

#### [Pattern] Tests verify both file creation AND correct variable interpolation per package manager. Each test covers: directory structure, all workflows, package manager placeholder replacement, setup action presence/absence. (2026-02-13)

- **Problem solved:** CI phase has multiple dimensions of correctness: directory structure, file count, content accuracy, and conditional logic.
- **Why this works:** Single-dimension tests miss entire classes of bugs. Testing placeholder replacement catches errors in regex/interpolation logic.
- **Trade-offs:** Multi-dimensional tests are more complex to write but catch more bugs.

### Verification test uses execSync to check TypeScript compilation and Node.js syntax validation rather than runtime execution (2026-02-13)

- **Context:** Need to validate branch-protection.ts compiles and produces valid JavaScript without actually calling GitHub API.
- **Why:** execSync('node -c') validates syntax without importing/executing; avoids dependency on gh CLI or GitHub auth during test.
- **Rejected:** Importing the module directly (would fail if gh CLI missing), mocking GitHub API (too heavy for syntax validation).
- **Breaking if changed:** If phase adds top-level gh CLI calls at import time, node -c validation will fail and hide the real problem.

#### [Pattern] Integration tests for npm packages must test the complete packaging lifecycle: build → npm pack → extract tarball → npm install in temp directory → import/execute. Each stage is critical to validate. (2026-02-13)

- **Problem solved:** Simply testing import after build doesn't validate that npm pack includes all necessary files, or that the published package will work when installed elsewhere.
- **Why this works:** npm pack can silently exclude files due to .npmignore, missing package.json exports fields, or incorrect build output. Only testing the full published package reveals these issues before release.
- **Trade-offs:** Integration tests are slower (npm install adds 5-15s per test) but catch production issues impossible to find in unit tests.

#### [Pattern] Separate temp directory cleanup into afterAll hook rather than manual cleanup in each test. Prevents stale test directories from accumulating and isolates test pollution. (2026-02-13)

- **Why:** Centralized cleanup in afterAll is guaranteed to run once after all tests complete, regardless of pass/fail.
- **Breaking if changed:** If afterAll cleanup is removed, test runs accumulate temp directories in OS temp space, eventually causing disk space issues or path conflicts.

#### [Pattern] Integration tests for dual-format packages (ESM and CJS) require separate test directories with different package.json type fields and require/import syntax. (2026-02-13)

- **Problem solved:** Single test directory can't reliably test both formats because Node's module resolution caches decisions based on type field and directory state.
- **Why this works:** Node.js treats .mjs and .cjs files differently depending on parent directory's package.json type field. Testing both requires isolated contexts to prevent cache pollution.
- **Trade-offs:** Two separate test blocks, but guarantees each format is validated in its correct context.

#### [Gotcha] Vitest `afterAll` must be imported from 'vitest', not assumed globally. Missing import causes silent test hang at teardown. (2026-02-18)

- **Situation:** afterAll cleanup hook appeared to run but test process hung indefinitely after all assertions passed.
- **Root cause:** Without explicit import, afterAll falls through to global scope (undefined), effectively becoming a no-op. The test runner waits for cleanup hooks that never complete.
- **How to avoid:** Always import { describe, it, expect, beforeAll, afterAll, vi } explicitly from 'vitest'. Never rely on global injection.

#### [Pattern] Mock mode via AUTOMAKER_MOCK_AGENT=true bypasses real agent execution for CI testing without requiring Claude API credentials. (2026-02-22)

- **Problem solved:** CI needs to test agent orchestration code without real API calls or API keys.
- **Why this works:** Mock agent immediately completes with success response. Tests verify orchestration logic (state transitions, event emission, worktree lifecycle) without testing the Claude API itself.
- **Trade-offs:** Mock doesn't test actual agent behavior, but agent behavior is tested separately via Claude API integration tests.

#### [Gotcha] TypeScript path aliases in tests require both tsconfig paths AND vitest resolve.alias configuration — one without the other silently breaks imports. (2026-02-25)

- **Situation:** After adding @/ path alias to tsconfig, tests importing @/lib/foo failed at runtime despite TypeScript compiling cleanly.
- **Root cause:** Vitest uses its own module resolver that doesn't read tsconfig.paths by default. Both must be configured independently.
- **How to avoid:** When adding path aliases to tsconfig, immediately add matching entry to vitest.config.ts resolve.alias.

#### [Pattern] Inline object stubs (not vi.mock) for interface-driven test coverage: Tests create inline implementations of BriefingWorldStateProvider, PMWorldStateBuilder, LeadEngineerWorldStateProvider to avoid mock complexity and preserve interface contract visibility. (2026-03-11)

- **Problem solved:** Integration tests verify data flow through three layers with failure scenarios. Code is heavily interface-driven with multiple collaboration points.
- **Why this works:** Inline stubs make interface contracts explicit in test code and provide fine-grained control over each layer's behavior independently. Mock libraries abstract away the contract.
- **Trade-offs:** More test setup boilerplate but better visibility. Easier to debug stub behavior. Less 'magic' in test infrastructure.

#### [Gotcha] applyRemoteChanges integration tests existed and compiled, but were dead code — never ran in CI/normal workflows, hid design evolution. (2026-03-12)

- **Situation:** Tests for abandoned features tend to rot while still compiling, creating false sense of coverage.
- **Root cause:** When feature-sync model was abandoned, tests weren't marked as deprecated or removed. They became invisible maintenance debt.
- **How to avoid:** Removing tests forces test suite to shrink and stay current. But loses historical documentation of why sync model existed.

#### [Pattern] Updated all 6 instance-identity resolution tests before removing code. Tests validate new resolution order and precedence rules with clear, single-concern test cases. (2026-03-12)

- **Problem solved:** Refactoring identity resolution — need confidence that new path works and captures all precedence scenarios
- **Why this works:** Tests serve as both validation and living documentation of resolution hierarchy; updating them first validates assumptions before code changes; makes the intent of precedence explicit
- **Trade-offs:** Unit tests are fast and deterministic; captures all edge cases (env override, registry miss, etc.) in one place; future changes to identity resolution are protected

#### [Pattern] When fixing stale data issues, test plan must explicitly verify freshness (last-modified time), not just 'can read file', to catch scenarios where fix reads different (but still stale) file (2026-03-12)

- **Problem solved:** Original bug was invisible during normal use (tool still returned _a_ log file, just wrong one); test plan called out 'lines from currently-running server's log (last-modified seconds ago, not 12 hours ago)'
- **Why this works:** Stale data bugs can masquerade as working if you only test for 'file exists' or 'can parse content'; explicit freshness check catches the actual problem being fixed
- **Trade-offs:** Requires more context-aware testing (know what freshness should be), but catches the real bug instead of false positives

#### [Pattern] Integration tests disable CRDT (no proto.config.yaml) to keep state on disk rather than in Automerge docs. This sidesteps the inconsistency where updatePhaseClaim writes to disk but getProject reads from doc. (2026-03-12)

- **Problem solved:** Services can write to disk (updatePhaseClaim) or read from doc (getProject), causing test flakiness if both operate on different state stores
- **Why this works:** Automerge document sync between instances adds complexity; disk-only state is deterministic for testing. Core CRDT logic is still tested via event propagation simulation.
- **Trade-offs:** Simpler, faster tests vs. not testing actual Automerge document consistency. Compensated by testing event wiring (EventBus → persistRemoteProject) which is the sync mechanism.

#### [Pattern] Unit tests verified broadcast() calls using Jest mocks and actual Express server on ephemeral port (2026-03-12)

- **Problem solved:** Route code needed verification that categories:updated events are broadcast correctly and files persist
- **Why this works:** Mock events.broadcast() to verify correct event signatures; real Express server to verify HTTP behavior and file I/O together without stubbing filesystem
- **Trade-offs:** Gained confidence in integration between routes and events; test setup more complex than pure unit tests


#### [Gotcha] Playwright tests can't run against worktree code because dev server serves main repo, not worktree branch. Test infrastructure doesn't support per-worktree dev servers. (2026-03-13)
- **Situation:** Attempted to verify dialog functionality with Playwright. Tests reused main repo dev server instead of worktree code.
- **Root cause:** Dev server configured with fixed paths (main repo). Worktrees are isolated git copies but share same dev server infrastructure.
- **How to avoid:** Gain: single dev server reduces resource overhead. Loss: can't test worktree changes in isolation without running separate server or static analysis.

#### [Gotcha] Turbo build cache was replaying old results. Direct tsc invocation (tsc --noEmit) was needed to verify type changes, bypassing the cached build. (2026-03-13)
- **Situation:** After code edits, npm run build:server returned cached results without recompiling the changed file.
- **Root cause:** Turbo aggressively caches task outputs. Incremental changes don't trigger cache invalidation if task hash hasn't changed fundamentally.
- **How to avoid:** Using tsc directly is faster for validation but doesn't test the full build pipeline (bundling, optimization). Full build catches more issues but is slower.

#### [Pattern] For setInterval-based logic, use vi.useFakeTimers() + vi.advanceTimersByTime() instead of real setTimeout waits. This eliminates timing flakiness and makes tests deterministic and fast. (2026-03-13)
- **Problem solved:** Original test used 3-second real-time polling with timeout checks, which is flaky due to OS scheduling variance. New test uses fake timers to advance exact intervals.
- **Why this works:** Fake timers decouple test execution from wall-clock time, making interval-based logic testable without false negatives from CPU contention or slow CI runners. Tests also run sub-millisecond.
- **Trade-offs:** Fake timers require wrapping in try/finally to restore real timers, but guarantee determinism and speed. Trade manual timer management for robustness.

#### [Gotcha] Pre-existing tests accessed result?.name on MatchResult type that actually returns { agent, confidence }. Type assertions were not validated — tests were accessing non-existent properties without type errors. (2026-03-13)
- **Situation:** 6 tests in matchFeature suite failed because they checked result?.name instead of result?.agent.name. This indicates test code drifted from the actual API.
- **Root cause:** Tests were likely written before the MatchResult type was formalized, or type checking was bypassed (possible loose tsconfig or missing type validation in test setup). Property access on union/object types wasn't caught at test time.
- **How to avoid:** Fixing tests revealed the actual type contract. Cost is finding and fixing 6 test assertions; benefit is ensuring tests validate the real API.

#### [Gotcha] Keyword matching scoring includes indirect matches. The test expected confidence ≈0.545 (18/33) but actual was 0.697 (23/33) because 'component' keyword in the agent description also contributed to the match signal. (2026-03-13)
- **Situation:** Multi-signal keyword matching test miscalculated expected score by omitting a matching signal that was actually present in the agent description.
- **Root cause:** Keyword matching is cumulative across multiple signal sources (agent name, description, extends). Test assertion only counted primary signals and missed secondary keyword contributions.
- **How to avoid:** Fixing test assertion requires understanding all signal sources. Cost is careful scoring audit; benefit is accurate confidence calibration.

#### [Pattern] Verified compiler configuration changes by running full monorepo typecheck (all 20 turbo tasks) rather than spot-checking modified or dependent packages (2026-03-15)
- **Problem solved:** Global compiler option change (strict mode) applied across inheritance chain affecting multiple packages
- **Why this works:** Compiler option changes have cascading effects across package dependencies. Full build verification catches incompatibilities that isolated package checks miss. Zero-error across all 20 tasks proves end-to-end compatibility.
- **Trade-offs:** Slower verification process trades off against comprehensive validation that catches transitive dependency issues and hidden incompatibilities

#### [Gotcha] TypeScript compilation errors in worktree (implicit any on event handlers) are artifacts of missing node_modules, not real project errors - match pre-existing files (2026-03-15)
- **Situation:** Worktree development environment lacks node_modules, causing @protolabsai/ui type definitions to be unresolved
- **Root cause:** Type checking needs actual type definition files; worktree isolation is intentional but creates misleading error messages that don't reflect real build state
- **How to avoid:** Clean worktree = faster checkout but obscures real type errors; full node_modules = accurate checking but slower setup

#### [Gotcha] Worktree environment uses npm install --ignore-scripts, which skips native module compilation. Tests requiring native bindings (better-sqlite3) cannot run. (2026-03-15)
- **Situation:** Attempted to create Vitest verification test for MaintenanceService queries, but better-sqlite3 native bindings weren't compiled in worktree
- **Root cause:** The worktree build process skips node-gyp compilation (likely due to previous failures or intentional to speed builds). Native modules need compiled .node files.
- **How to avoid:** Faster build times in worktree vs can't run integration tests that need native modules; must use patterns from knowledge-flow-pipeline.test.ts (describe.skipIf(!hasSqlite))

#### [Pattern] Schema-aware test setup matching production table names and structure (maintenance, maintenance_completions, vault_entries) with correct column definitions (2026-03-15)
- **Problem solved:** Tests must accurately reflect database state to test algorithm correctly
- **Why this works:** Mismatched schema (e.g., maintenance_schedules vs maintenance) causes test failures and hides real issues. Tests must be source of truth for valid data shapes
- **Trade-offs:** More maintenance burden (test schema must evolve with production) but catches schema migrations that break algorithm

#### [Gotcha] Type correctness verified by manual code review against maintenance-view patterns instead of running tsc - build tooling unavailable in worktree (2026-03-15)
- **Situation:** No node_modules/.bin/tsc available in worktree environment; couldn't run typecheck during development
- **Root cause:** Constraint-driven: pragmatic trade-off when build environment is constrained; relying on pattern consistency works when codebase is uniform
- **How to avoid:** Faster iteration vs higher type error risk; works only because maintenance-view patterns are well-established and followed precisely

#### [Pattern] Implemented shared decorator factory (withQueryClient) in mockProviders.tsx to inject React Query providers for story components. Decorator handles cache pre-population with mock data from centralized mockData.ts. (2026-03-15)
- **Problem solved:** Multiple components across 8 UI modules depend on React Query for data fetching. Stories need consistent, realistic data without duplicating provider logic.
- **Why this works:** Decorator pattern allows reusable, composable provider setup; centralizing mock data ensures consistency across all 27 stories and reduces maintenance burden
- **Trade-offs:** Centralized maintenance easier but less per-story flexibility; requires understanding Storybook decorator mechanics

#### [Pattern] Celebration sub-components that are private (not exported) within celebrations.tsx were replicated as separate visual stories with play function interaction tests, rather than only testing through parent component. (2026-03-15)
- **Problem solved:** Internal celebration components (XpToast, AchievementBanner, etc.) needed documentation and interaction testing without exposing them as public API.
- **Why this works:** Allows thorough testing and documentation of internal components; play functions enable interaction test scenarios without treating privates as public
- **Trade-offs:** Better component visibility and testing coverage vs. maintenance burden of keeping stories in sync with internal implementations

#### [Gotcha] Storybook play function `canvasElement` parameter lacks type information when @storybook/test is not available in isolated tsc context. Type errors are expected in worktree setup and should be filtered as pre-existing issues, not blocking problems. (2026-03-15)
- **Situation:** Isolated tsc type checking of story files reported implicit `any` type for canvasElement despite valid Storybook usage. Error filtering needed to distinguish real issues from environment limitations.
- **Root cause:** Type checking runs in isolation without @storybook/test module available; canvasElement types come from that module, which isn't resolved during isolated check
- **How to avoid:** Acceptable type unsafety in dev environment vs. avoiding false positives in CI; requires developer understanding that type errors aren't real issues

#### [Gotcha] Original test assertion `expect(result.length).toBeLessThanOrEqual(1)` masked the actual expected behavior; corrected to `expect(result).toHaveLength(1)` with explicit category verification. (2026-03-15)
- **Situation:** Test was named 'returns empty array when no conditions met' but assertion allowed both 0 and 1 result, hiding that seasonal quest should *always* generate.
- **Root cause:** Loose range assertions allow multiple interpretations and hide implementation bugs. The ≤1 range concealed that seasonal quest logic was working but test didn't verify it.
- **How to avoid:** Precise assertion (toHaveLength + category check) makes test brittle if behavior changes, but correctly documents the contract.

### Skipped Playwright integration tests for WeatherService because service requires OPENWEATHERMAP_API_KEY to function meaningfully; no-op without config (2026-03-15)
- **Context:** Attempted to add verification step for weather integration; realized service degrades gracefully, making automated testing impossible without external dependency
- **Why:** Testing a no-op service proves nothing; meaningful test requires real API key; CI/CD shouldn't depend on external API keys or network requests
- **Rejected:** Mocking API responses (doesn't test real API contract); Skipping testing entirely (no verification); Requiring API key in CI (security risk, quota issues)
- **Trade-offs:** Easier: no external dependencies in CI. Harder: manual verification required; developers must test with real API key locally
- **Breaking if changed:** If this changes to require integration tests in CI, must solve API key management; if testing is added without mocking, CI becomes flaky and expensive

#### [Gotcha] Feature requires manual verification: 'dev server running, register sensor, POST command, GET commands' - no automated integration tests written (2026-03-15)
- **Situation:** Implementation complete; builds pass; but no Playwright/E2E tests for command flow
- **Root cause:** E2E testing requires full stack setup; complex to mock device registration and polling cycle; manual steps faster for MVP
- **How to avoid:** Speed to feature gain; regression risk - command flow breakage only caught manually; brittle to future changes

#### [Pattern] Implement deterministic verification that every actual library directory has a corresponding COPY directive in Dockerfile, not relying on manual review or runtime discovery (2026-03-15)
- **Problem solved:** Dockerfile COPY commands can drift from actual lib structure; builds succeed even with incomplete dependency copies until runtime failure in container
- **Why this works:** Silent sync failures cause production outages; verification catches them in CI before merge, when they're cheap to fix
- **Trade-offs:** Requires bash validation logic to maintain but eliminates entire class of production build failures