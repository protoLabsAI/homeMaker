---
tags: [database]
summary: database implementation decisions and patterns
relevantTo: [database]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 8
  referenced: 3
  successfulFeatures: 3
---
<!-- domain: Database & Persistence | Data storage patterns, query optimization, schema decisions -->

# database

#### [Pattern] Compute derived fields (prReviewDurationMs) at write-time rather than query-time (2026-02-11)

- **Problem solved:** Review duration is a simple calculation (merge_time - creation_time) that could be computed on-demand during queries
- **Why this works:** Write-time computation enables efficient filtering/sorting on the board UI without requiring post-processing. Stores a snapshot of the metric at the moment of merge, creating immutable audit trail. Query-time computation would require fetching two timestamp fields + JavaScript arithmetic on every read.
- **Trade-offs:** Adds storage (~8 bytes per merged feature) and write-time processing, but eliminates compute on every read. Favors read-heavy metrics workload (board queries, analytics aggregations)

### Event type union in libs/types must be extended to include new event types (github-state-drift) (2026-02-14)

- **Context:** New event type needed to be discoverable and type-safe across all services
- **Why:** Centralized EventType union provides compile-time type safety and makes all event types discoverable in one location for documentation
- **Rejected:** Could have hardcoded string literals in each service but loses type safety and makes refactoring dangerous
- **Trade-offs:** Requires updating shared type library (more coordination) but enables type-safe event subscriptions everywhere
- **Breaking if changed:** Services subscribing to 'github-state-drift' events will have type errors if event type not in union; type checking would prevent misnamed events

#### [Pattern] Model preference stored per-workflow in localStorage (keys like 'copilotkit-model-default'), not globally (2026-02-15)

- **Problem solved:** Different workflows (agents) may have different optimal models. User might want Haiku for lightweight operations but Opus for complex reasoning
- **Why this works:** Per-workflow storage allows user to maintain separate model preferences for different use cases without constant switching. Respects the fact that workflow context changes optimal model choice
- **Trade-offs:** Slight increase in localStorage entries (one per workflow instead of one global) but gained better UX and workflow-specific optimization capability. Makes migration harder if workflow IDs ever change

### Deduplication implemented per-monitor using platform-specific ID tracking (Twitter tweet IDs, RSS GUIDs) rather than centralized content-based deduplication. (2026-02-22)

- **Context:** Each platform has different ID schemes and native deduplication mechanisms. Need to prevent duplicate signal emissions.
- **Why:** Keeps deduplication logic co-located with platform-specific understanding. Each platform's ID scheme is natural for that platform. Simpler implementation than content hashing or URL normalization across platforms.
- **Rejected:** Centralized deduplication by content hash or URL - would require normalizing URLs across platforms, handling encoding differences, and determining whether same story on multiple platforms is duplicate or new signal.
- **Trade-offs:** Simpler per-monitor logic vs inability to detect same content posted to multiple platforms. If monitor state resets (restart, deployment), previously seen IDs are lost and duplicates re-appear.
- **Breaking if changed:** If monitor state persistence is removed (e.g., in-memory only), duplicates become visible. If new platforms are added with IDs that collide with existing IDs, false deduplication occurs.

#### [Pattern] Atomic persistence pattern: Both phaseDurations and toolExecutions are persisted via FeatureLoader.update() to prevent partial writes when multiple services modify feature.json concurrently. (2026-02-23)

- **Problem solved:** Pipeline orchestrator persists phase duration, agent service persists tool executions—both write to the same feature.json file
- **Why this works:** Race condition risk: if pipeline-orchestrator and agent-service write to feature.json without coordination, one write can clobber the other. FeatureLoader uses atomic file operations (write-to-temp, rename).
- **Trade-offs:** Atomic writes guarantee consistency but require understanding FeatureLoader's atomic mechanism. Developers unfamiliar with the pattern might use direct fs.writeFileSync() and create race conditions.

#### [Pattern] Conditional state mutation: lastCeremonyAt and counters only update on confirmed success. Creates immutable audit trail: if counter didn't increment, nothing happened. (2026-02-24)

- **Problem solved:** Previously, ceremony state would update even if Discord post failed, creating inaccurate ceremony history and timestamps.
- **Why this works:** State should reflect actual delivered ceremonies, not attempted ceremonies. Simplifies understanding: 'if counter exists in output, it actually happened'. Timestamp represents real event, not failed attempt.
- **Trade-offs:** Easier: Simpler model—count means it happened. Harder: Failed attempts leave no trace in counters. Harder: Requires checking return value in all callers before state update.

#### [Pattern] Store source system identifiers (linearIssueId) on records created from external integrations to enable reliable deduplication and tracking. (2026-02-24)

- **Problem solved:** SignalIntakeService created features from Linear signals but didn't store linearIssueId, making it impossible to deduplicate based on source system identity.
- **Why this works:** Without the external ID stored, dedup becomes fragile: you'd have to match on title (couples to title format), content (changes break dedup), or timestamps (unreliable). Source ID is the source of truth for 'is this the same external thing?'.
- **Trade-offs:** Slight data model expansion (one extra field) vs. reliable deduplication and source tracking. Field becomes a foreign key-like identifier for dedup queries.

### Enabled SQLite WAL (Write-Ahead Logging) mode via pragma('journal_mode = WAL') for the knowledge store database (2026-02-24)

- **Context:** Knowledge store needs high concurrent read performance as it will be frequently queried during development
- **Why:** WAL mode separates read and write operations, allowing concurrent reads while writes are in progress. Default rollback journal serializes all operations.
- **Rejected:** Default rollback journal mode - simpler but blocks reads during writes
- **Trade-offs:** Gains: Much better concurrent read performance. Losses: Requires additional cleanup on process exit (checkpoint operations), doesn't work on all filesystems (network drives, some cloud storage), more complex backup strategy
- **Breaking if changed:** Removing WAL mode would cause read operations to block during writes, significantly degrading performance under concurrent access patterns

#### [Pattern] Used SQLite FTS5 virtual table with automatic INSERT/UPDATE/DELETE triggers to keep full-text search index synchronized with main chunks table (2026-02-24)

- **Problem solved:** Need efficient full-text search on chunk content and headings without manual index management scattered throughout application code
- **Why this works:** Automatic triggers guarantee index stays synchronized with source data. Single source of truth: triggers defined once at schema time, then always applied. Prevents bugs from forgotten index updates in application code.
- **Trade-offs:** Gains: Simpler application code, guaranteed consistency, single point of maintenance. Losses: Slight write overhead from trigger execution, less visibility into when updates happen

### Created comprehensive database schema with full metadata columns (source_type, source_file, project_path, chunk_index, heading, tags, importance, created_at, updated_at) rather than minimal schema (2026-02-24)

- **Context:** Designing schema for knowledge store that needs rich filtering, sorting, and statistics capabilities
- **Why:** Comprehensive metadata enables future features: filter by source type, track chunk origin, calculate stats by source, sort by importance/timestamp, and organize by project. Better to include now than add columns later.
- **Rejected:** Minimal schema with just id, content, and created_at - simpler but would require schema migration to add these later
- **Trade-offs:** Gains: Flexibility for future features, rich statistics possible. Losses: More storage overhead, more complex inserts/updates, more careful typing needed
- **Breaking if changed:** Removing columns would lose capability to filter/sort by source or importance, break any code depending on these fields

### Selected Turso (serverless SQLite) as primary database migration path instead of PostgreSQL for hosted deployments (2026-02-24)

- **Context:** Application currently uses SQLite locally, needs hosted database solution for multiple deployment platforms
- **Why:** Turso maintains SQLite compatibility (easier migration, minimal code changes) while providing edge replication, global distribution, and serverless scaling. PostgreSQL would require schema and driver changes
- **Rejected:** PostgreSQL with managed services (RDS, Render's native PostgreSQL) would mean more infrastructure control but requires code migration and different connection pooling strategies
- **Trade-offs:** Lower migration friction and protocol compatibility vs vendor lock-in to Turso and different scaling characteristics than traditional PostgreSQL
- **Breaking if changed:** If switching away from Turso, requires full database migration including schema translation, connection string changes, and potential application code updates

#### [Gotcha] Incremental processing via null-check creates hidden state versioning problem. Worker only processes chunks where `hype_queries IS NULL`. If generation logic changes, existing chunks won't be regenerated. (2026-02-24)

- **Situation:** To support restart-safety and incremental progress, only chunks without hype_queries are processed
- **Root cause:** Allows resuming interrupted processing without duplication. Chunks that failed on retry can be reattempted without reprocessing successful ones.
- **How to avoid:** Simplicity and restart-safety gained, but creates invisible state that may become stale if logic changes

#### [Gotcha] Embeddings stored as Buffer (Float32Array.buffer) in SQLite BLOB column. Encoding endianness and platform-specific byte order are persisted without conversion. (2026-02-24)

- **Situation:** SQLite has no native array/vector type, so embeddings must be serialized to BLOB
- **Root cause:** Binary BLOB is 4x more space-efficient than JSON and enables bulk binary I/O. Float32Array.buffer provides direct byte representation without JSON overhead.
- **How to avoid:** Efficiency gained but reduced portability. Cross-platform and cross-architecture compatibility requires explicit endianness handling on deserialization.

### Deduplication threshold: BM25 score < -5 (log-odds), pruning after 90 days OR zero retrieval count (whichever comes first). (2026-02-24)

- **Context:** memory-system.md documents write pipeline deduplication (BM25 < -5) and pruning policy (90d + zero retrieval).
- **Why:** BM25 < -5 is low-confidence match threshold (empirically chosen from similarity experiments—not documented but discoverable in code). Combining time-based (staleness) AND usage-based (relevance) pruning prevents two failure modes: (1) keeping irrelevant docs forever just because they're new, (2) removing useful docs that happen to not be retrieved recently.
- **Rejected:** Could use only time-based pruning (simpler, but keeps unused docs consuming space). Could use only usage-based (discards potentially useful but less-frequently-accessed domain knowledge). Could use single threshold (BM25 > some value) without time component.
- **Trade-offs:** Dual-criterion pruning is more complex to reason about and requires observing both metrics. But: prevents accumulating stale knowledge and prevents useful knowledge from being garbage-collected just because it's not in the hotpath.
- **Breaking if changed:** Removing time-based pruning allows knowledge bloat. Removing usage-based pruning keeps rarely-used but valid docs. Changing BM25 threshold dramatically changes what counts as 'duplicate' (too high = misses duplicates, too low = false positives).

### Store hype_queries as TEXT (JSON array) but hype_embeddings as BLOB (binary Float32Array buffer) (2026-02-24)

- **Context:** Need to store both generated questions and their computed embeddings in same record
- **Why:** Hybrid approach: TEXT for debuggability and inspection, BLOB for embedding efficiency (8x smaller than JSON float arrays). Simplifies querying questions without deserialization
- **Rejected:** All-BLOB storage (smaller but loses query introspection); all-JSON storage (simpler schema but 8x larger embeddings column)
- **Trade-offs:** Requires different serialization logic per column but gains both queryability and space efficiency
- **Breaking if changed:** Changing hype_embeddings to TEXT would increase storage 8x; changing hype_queries to BLOB would eliminate ability to index/search questions without deserialization

### Store HyPE embeddings in chunks.hype_embeddings column (pre-computed) rather than computing at query time (2026-02-24)

- **Context:** HyPE embeddings are expensive to compute (require running model on stored query embeddings) and don't change for static corpus
- **Why:** Pre-computation trades storage space for elimination of query-time computation latency. Since HyPE embeddings are deterministic given static query embeddings, computing once at ingestion time is strictly better than computing every search.
- **Rejected:** Query-time computation (increases latency by model inference time), separate embeddings table (would require schema migration)
- **Trade-offs:** Storage cost (embeddings take disk space) for latency gain (no inference per search). Schema is denormalized but justified by performance.
- **Breaking if changed:** If chunk embeddings are updated, HyPE embeddings become stale and must be recomputed; removing this column disables hybrid_hype mode

### Store averaged embeddings as Float32Array serialized to Buffer (BLOB), not JSON string (2026-02-24)

- **Context:** Persisting 384-dim embedding vector to SQLite for each chunk
- **Why:** 10-50x space efficiency vs JSON stringification; preserves numeric precision; faster serialization/deserialization
- **Rejected:** Store as JSON array of numbers; or external vector DB; or as separate embedding table
- **Trade-offs:** Binary format is opaque in database inspection but gains efficiency; tied to Float32Array representation, not portable
- **Breaking if changed:** Format migration if switching vector DB backends; if you inspect SQL with tools expecting JSON, get unreadable binary

#### [Pattern] Outcome-based trajectory categorization: single outcome field ('success' vs 'escalated') enables different downstream processing without schema branching (2026-02-24)

- **Problem solved:** DeployProcessor and EscalateProcessor both call save() but with different outcome values and different supplemental fields (failureAnalysis only on escalation)
- **Why this works:** Discriminated union pattern: single schema with outcome tag determines which optional fields are present, avoiding multiple schema variants
- **Trade-offs:** Gains: Single schema evolution point, flexible for new outcomes. Loses: Schema validation must be conditional on outcome field

### Using TSDB schema with filesystem storage in Loki configuration instead of older BoltDB-based schemas or cloud storage backends (2026-02-25)

- **Context:** Selecting storage architecture for self-hosted log aggregation in Loki v3.x
- **Why:** TSDB schema in Loki v3.x is optimized for performance and recommended upstream; filesystem backend enables self-hosted deployment without cloud dependencies
- **Rejected:** Older schema versions (legacy); cloud storage (S3, GCS) which adds operational complexity and latency
- **Trade-offs:** Better query performance and simpler deployment vs limited horizontal scalability; schema version is immutable once data is written
- **Breaking if changed:** Schema version must match across all Loki instances; changing schema requires data migration or reindexing

#### [Pattern] TrustTierService uses AtomicWriter (not direct fs.writeFile) for persisting trust-tiers.json. Data updates are atomic — partial writes cannot corrupt the file. Aligns with SettingsService and AnalyticsService pattern for security-critical persistent state. (2026-02-25)

- **Problem solved:** Trust tier records are security-sensitive. Corruption or partial updates could grant unintended access. File-based storage chosen for simplicity and auditability.
- **Why this works:** Atomic writes guarantee that trust state is always consistent. A crash or process kill during write cannot leave the file in a partially-updated state. Essential for security-related data where any corruption is a security breach.
- **Trade-offs:** AtomicWriter adds ~10-20ms overhead per write (temp file + rename). But guarantees correctness, which is non-negotiable for trust data. Trade speed for reliability on writes that should be rare anyway.

#### [Pattern] Backward compatibility via absence: features created before quarantine feature was implemented have no quarantineStatus field. System treats this absence as implicit 'bypassed' status without migration. (2026-02-25)

- **Problem solved:** Adding quarantine metadata to existing features requires migration or graceful degradation. No migration job was written.
- **Why this works:** Implicit bypass via absence is safe default (old features continue working). Avoids complex migration logic. Clear data semantics: missing field means 'pre-quarantine era'.
- **Trade-offs:** Simpler deployment (no migration) vs audit ambiguity (can't distinguish 'bypassed' from 'never validated'). Acceptable because quarantine is a new security feature, not a fix for existing data.

### Persisted git workflow errors directly to feature.json via featureLoader.update() rather than separate error tracking/logging system (2026-02-25)

- **Context:** Need to store git errors so they survive server restarts and are accessible to all clients querying feature state
- **Why:** Colocates error data with feature data - single source of truth, no distributed state, errors immediately visible in feature snapshots, follows existing update patterns
- **Rejected:** Separate error log file, database error table, or in-memory error registry - would require coordination with feature state and add potential sync issues
- **Trade-offs:** feature.json includes error metadata (slightly larger JSON); error state travels with feature across systems; simplified debugging but feature.json schema now has optional error fields
- **Breaking if changed:** Code that assumes feature.json only contains production-happy paths; serialization/deserialization must handle optional gitWorkflowError; migrations needed if schema versioning was strict

### Added `trackedSince?: number` timestamp to TrackedPR interface to record when PR tracking started. Used to compute elapsed time for MISSING_CI_CHECK_THRESHOLD_MS comparison. (2026-03-04)

- **Context:** Need to know if PR has been in pending state long enough (default 30 min) to distinguish between 'CI still initializing' and 'CI workflow misconfigured and will never run'.
- **Why:** Timestamp on the tracked entity is the source of truth; avoids external time tracking or separate tables. Settable at tracking start, immutable after.
- **Rejected:** Alternative: track in separate Map<prNumber, timestamp> (duplication); compute from PR creation date (ignores when tracking starts); poll duration metric (loose coupling, harder to test).
- **Trade-offs:** One extra field per PR, set once at tracking init. Clearer intent than computed time. No extra queries.
- **Breaking if changed:** Removing trackedSince means threshold check always uses PR creation date (wrong baseline, triggers false positives for old-but-recently-tracked PRs).

#### [Pattern] DEFAULT_AVA_CONFIG uses concrete empty array `mcpServers: []` for the new field, not undefined. Field type is optional `mcpServers?: MCPServerConfig[]` but initialization is required and empty. (2026-03-04)

- **Problem solved:** DEFAULT_AVA_CONFIG already had concrete defaults for model, temperature, systemPrompt, etc. New mcpServers field needed to follow same pattern.
- **Why this works:** Concrete empty array allows downstream code to call `.filter()` and `.map()` without null checks. Optional type in interface allows ava-config.json to omit the field entirely (schema evolution). Both design goals met simultaneously.
- **Trade-offs:** More memory for empty array vs undefined, but eliminates defensive checks throughout the codebase. Clearer code at cost of one extra object allocation per load.

#### [Pattern] Dual-layer artifact storage: separate index.json alongside individual artifact files at `.automaker/projects/{slug}/artifacts/{type}/{id}.json` (2026-03-07)

- **Problem solved:** Need both fast artifact querying (listArtifacts) and durable individual artifact storage
- **Why this works:** Index enables O(1) listing without filesystem scans. Individual files enable easy backup, version control, and atomic writes per artifact.
- **Trade-offs:** Gain: fast queries, atomic per-artifact writes, human-readable on-disk format. Lose: index-file consistency requires careful synchronization, dual-write problem.

### Event list persisted as-is (no compaction/archival) rather than maintaining rolling aggregate that's updated in place (2026-03-10)

- **Context:** Over time, error-budget.json array will grow as more PRs are merged. No cleanup logic removes old events outside the window.
- **Why:** Immutable log semantics: audit trail intact, window filtering is pure function of current time. Alternative (aggregate update) requires deciding when to purge, handling edge cases around window boundaries.
- **Rejected:** Maintaining in-place aggregate (compact to {totalLastWeek, failedLastWeek}): loses history, requires scheduled compaction job, complex to get window transitions right.
- **Trade-offs:** Easier: correctness guaranteed by query logic. Harder: file grows unbounded (mitigated by low event frequency—~handful per day worst case).
- **Breaking if changed:** If changed to compacting aggregate: history lost, audit trail gone, window boundary logic becomes complex and bug-prone.

#### [Gotcha] prReviewDurationMs calculated as Date.now() - prCreatedAt in same code block as prMergedAt assignment. Calculation uses raw milliseconds while prMergedAt is serialized to ISO string, creating subtle timing/precision inconsistency. Refactoring or delaying calculation breaks the implicit coupling and causes duration divergence. (2026-03-10)

- **Situation:** Persisting merge metrics: both prMergedAt and prReviewDurationMs set synchronously after merge confirmation
- **Root cause:** Works currently due to colocation, but creates hidden dependency. Better design: calculate duration from deserialized prMergedAt to ensure values are verifiably consistent.
- **How to avoid:** Simple synchronous approach works when collocated; explicit dependency would require parsing prMergedAt post-persistence

#### [Pattern] normalizeProjectDocument() fills missing fields with safe defaults: status→'researching', milestones→[], prd (string)→SPARCPrd{approach}, \_meta.instanceId→'unknown', timestamps derived from \_meta. Phases missing executionStatus default to 'unclaimed'. (2026-03-12)

- **Problem solved:** Legacy documents have different schemas (plain-string PRD instead of structured SPARCPrd, missing status/milestones)
- **Why this works:** Enables forward compatibility: old documents work with new code without explicit migrations. Normalization at read-time is safer than runtime type assertions.
- **Trade-offs:** Forgiving data handling vs. stricter schema. Normalization hides schema drift; consider logging when defaults are applied.

### Categories use Last-Write-Wins (LWW) file overwrite semantics instead of CRDT merge (2026-03-12)

- **Context:** Simple string array state (categories list) needed to sync across instances
- **Why:** Categories don't require distributed merge resolution; simple overwrite is safe, readable, and maintainable. Full CRDT complexity unnecessary for non-structured data
- **Rejected:** Could implement CRDT-style merge with vector clocks; would handle concurrent writes perfectly but massive overkill
- **Trade-offs:** Gained simplicity and readability; traded away ability to recover from concurrent category additions across instances (last write wins)
- **Breaking if changed:** If requirements change to preserve concurrent category additions across instances, entire synchronization strategy fails and needs CRDT rewrite

#### [Pattern] Schema-on-read migration: normalizeNotesWorkspace() applies defaults for all missing fields (tabs, tabOrder, activeTabId) (2026-03-12)

- **Problem solved:** Disk workspace.json may exist in older format from before NoteTab/NotesWorkspaceDocument schema was formalized
- **Why this works:** Allows gradual schema evolution without hard migrations. Old disk files are automatically uplifted to new format on read. No script-based data transformation needed.
- **Trade-offs:** Easier evolution vs. schema divergence: old disk files may differ from current schema, hidden behind normalizer. Bugs in normalization logic silently corrupt data.


### Persist lastRunAt via SettingsService.updateGlobalSettings() deep-merge on ceremonies.dailyStandup.lastRunAt, rather than direct state mutation or separate DB write (2026-03-13)
- **Context:** Need to record when standup last ran, but avoid losing concurrent updates to GlobalSettings; settings is already deep-merged elsewhere
- **Why:** Maintains immutability of GlobalSettings; uses existing settings update mechanism; deep-merge prevents overwriting sibling config values
- **Rejected:** Direct mutation of service state would be lost on restart; separate DB table fragments settings into multiple places; raw writes might overwrite concurrent updates
- **Trade-offs:** Safer (respects concurrent updates); slower (full settings fetch → merge → write); couples ceremony state to GlobalSettings schema
- **Breaking if changed:** If SettingsService.updateGlobalSettings() behavior changes (no longer deep-merges), concurrent updates to other settings will be lost

#### [Pattern] Cycle guard in epicId traversal uses Set(visited) to track seen IDs. If ID revisited, breaks loop and returns null (skipped) (2026-03-14)
- **Problem solved:** epicId creates parent-child links; data corruption/user error can create cycles (A→B→C→A). Without guard, infinite loop
- **Why this works:** Defensive against circular data. Graceful degradation (mark as skipped) is safer than hanging or throwing. Typical for graph traversal in untrusted data
- **Trade-offs:** Easier: robust to bad data. Harder: one Set allocation per feature, extra code

### Persistence uses single `automations.json` file instead of per-file `.automaker/automations/{id}.json` pattern specified in requirements (2026-03-14)
- **Context:** Feature spec called for per-file storage; implementation chose centralized file
- **Why:** Simpler atomic writes (write-to-temp-then-move), easier list operations without directory scanning, reduces file system churn
- **Rejected:** Per-file pattern would require directory enumeration on list(), separate file handles per automation, and directory-level transaction handling
- **Trade-offs:** Gained: atomic guarantees, simple list implementation. Lost: file-level isolation, easier concurrent access patterns
- **Breaking if changed:** Switching to per-file requires rewriting persistence layer: map-reduce across directory, handle file conflicts in concurrent scenarios, deal with orphaned files

### SQLite file-based database with auto-table creation on BudgetService instantiation (2026-03-15)
- **Context:** Service initialized with dataDir parameter, creates/initializes SQLite DB automatically without migration tools
- **Why:** Zero external service dependencies, no ops burden, embedded with application, automatic schema initialization avoids migration drift
- **Rejected:** PostgreSQL/MySQL - adds deployment complexity, separate service management, migration versioning burden. Cloud DB (Firebase) - loses offline capability, increases vendor lock-in
- **Trade-offs:** Single-machine bottleneck - can't distribute across servers. File locking under concurrent writes limits throughput. Easy backup (copy file) vs hard replication
- **Breaking if changed:** Scaling to multiple backend instances requires migration to shared DB (PostgreSQL) - all queries must change, connection pooling patterns change. Multi-region scenarios impossible

### SQLite chosen as backing store; only ciphertext + IV + auth tag are persisted—never plaintext. Encryption happens in-process before write. (2026-03-15)
- **Context:** Choosing persistence layer for encrypted secrets vault
- **Why:** SQLite keeps secrets local (no external service needed), and in-process encryption means plaintext never touches disk. Simplifies deployment and reduces external dependencies.
- **Rejected:** External key-value store (Redis/Memcached) would require trusting network transport and another service's memory. Relational DB (PostgreSQL) adds complexity.
- **Trade-offs:** Single-instance only; no distributed vault across multiple servers. Backup/restore must preserve SQLite file and HOMEMAKER_VAULT_KEY separately.
- **Breaking if changed:** Migrating to external database requires rearchitecting encryption boundaries. Plaintext cannot be stored in external DB without changing entire security model.

#### [Gotcha] BetterSqlite3 instantiation requires .default(path) not new BetterSqlite3(path) (2026-03-15)
- **Situation:** The codebase uses BetterSqlite3 with CommonJS module resolution pattern
- **Root cause:** CommonJS default export handling differs from ES6 modules; the package exports default as the constructor
- **How to avoid:** None if understood; critical blocker if pattern is inverted

### Table creation deferred until first access (CREATE TABLE IF NOT EXISTS), not via separate migration system (2026-03-15)
- **Context:** 7 related tables must exist before any service can operate, but no migration framework is present
- **Why:** Reduces deployment complexity, works across fresh and existing databases, eliminates migration ordering concerns
- **Rejected:** Separate migration framework - adds dependency, requires ordering, fails if migrations already partially applied
- **Trade-offs:** Easier: simpler deployment; Harder: schema evolution becomes ad-hoc, no version tracking, difficult to roll back schema changes
- **Breaking if changed:** Removing CREATE TABLE IF NOT EXISTS means tables must be pre-created or first access will fail; schema changes require manual intervention

### WAL mode and PRAGMA foreign_keys=ON enabled at initialization, not lazily or per-query (2026-03-15)
- **Context:** Concurrency and referential integrity are requirements; configuration must be consistent across all access patterns
- **Why:** WAL enables concurrent readers while writes are happening; foreign keys enforced at engine level prevent data corruption from app bugs
- **Rejected:** Skipping WAL - serialized read/write access; skipping foreign keys - schema violations become possible in buggy code
- **Trade-offs:** Easier: built-in protection; Harder: WAL creates .wal/.shm files (not just .db), foreign keys add query validation overhead
- **Breaking if changed:** Disabling foreign keys allows orphaned references (transactions without categories); disabling WAL reverts to serialized access, breaking concurrent sensor reads

#### [Gotcha] BudgetService creates legacy budget.db; budget_categories and transactions tables now exist in both homemaker.db and budget.db (2026-03-15)
- **Situation:** Shared DB was introduced without migrating existing BudgetService, deferred to separate feature
- **Root cause:** Reduces scope of this PR, avoids cascading refactoring of BudgetService, allows parallel work on other services first
- **How to avoid:** Easier: smaller PR; Harder: temporary schema duplication, hidden sync risk if both tables are mutated separately

### Store inventory in shared homemaker.db SQLite rather than separate file, using InventoryService wrapper around database queries (2026-03-15)
- **Context:** BudgetService uses file-based JSON storage, but inventory needs complex querying (search, filters, aggregations)
- **Why:** SQLite enables full-text search, aggregation queries (sum costs by category), efficient filtering, and shared single-file backup with other homeMaker data
- **Rejected:** Could use separate JSON file per asset (unscalable), or file-based like BudgetService (impossible to aggregate/search efficiently)
- **Trade-offs:** More complex schema management but enables sophisticated queries and better performance; single point of failure if db corrupts but atomic with other data
- **Breaking if changed:** If SQLite database file is deleted or schema migrations fail, all inventory data lost and APIs return errors

### WARRANTY fields stored as ISO date strings, with warranty expiration status computed at query-time rather than pre-calculated (2026-03-15)
- **Context:** Warranty report endpoint groups assets by warranty status (active/expiring/expired)
- **Why:** Dates never change in database, only 'now' changes, so query-time comparison gives fresh results without scheduled recalculation
- **Rejected:** Could cache warranty status in a boolean column (requires update jobs), or precompute expiration warnings
- **Trade-offs:** Query is slightly more expensive but always current; no background jobs needed
- **Breaking if changed:** If warranty calculation logic changes, all old assets instantly get different status without migration

### nextDueAt is maintained as a recalculated derived field (not just queried on-the-fly) and updated after create/update/complete operations (2026-03-15)
- **Context:** MaintenanceSchedule stores nextDueAt; it's recalculated when intervalDays changes (update) or schedule completed (complete) based on lastCompletedAt + intervalDays
- **Why:** Enables efficient filtering and sorting for /upcoming and summary endpoints without computing for entire dataset; query performance optimization
- **Rejected:** Calculate nextDueAt on-the-fly for every query; store only intervalDays and lastCompletedAt and compute at read-time
- **Trade-offs:** Faster queries but requires synchronization logic at multiple write points; easier to get out-of-sync if update paths are missed; simpler if computed at query-time
- **Breaking if changed:** Removing nextDueAt recalculation would require changing /upcoming and /summary query logic to compute from intervalDays+lastCompletedAt

#### [Pattern] MaintenanceCompletion records are immutable audit trail separate from MaintenanceSchedule, not embedded/updated in schedule record (2026-03-15)
- **Problem solved:** Each completion creates a new MaintenanceCompletion record; schedule's lastCompletedAt points to latest; full history available via /completions endpoint
- **Why this works:** Preserves complete audit trail of all maintenance performed; enables historical analysis and cost rollups; schedule state remains 'current' not historical
- **Trade-offs:** More storage and schema complexity but richer historical data; easy audit trail but requires JOIN to see completion details; enables cost tracking and analysis

#### [Pattern] MaintenanceService follows exact InventoryService pattern: DB singleton injection, idempotent schema init, same service registration in ServiceContainer (2026-03-15)
- **Problem solved:** New domain entity (maintenance schedules) needed to be added to system that already had InventoryService pattern established
- **Why this works:** Reduces risk of introducing inconsistencies, ensures MaintenanceService works with existing DI and service lifecycle patterns without surprises
- **Trade-offs:** Consistency and safety vs less flexibility if maintenance needs diverge from inventory later

### MaintenanceSchedule.nextDueAt is a plain date string field (YYYY-MM-DD) not a timestamp, consistent with CalendarEvent.date (2026-03-15)
- **Context:** Scheduling system needs to track when maintenance is due. Calendar events also use date-only format without time-of-day
- **Why:** Aligns with existing CalendarEvent domain model which is date-centric; simplifies 'due within 7 days' query logic; reduces timezone complexity
- **Rejected:** Using Unix timestamps would add timezone handling complexity and break consistency with CalendarEvent.date representation
- **Trade-offs:** Simpler queries and consistency vs cannot express time-of-day precision (all schedules are treated as 'due by end of day')
- **Breaking if changed:** If business logic requires scheduling at specific times (e.g., 'due at 2pm'), field design must change and all dependent queries break

#### [Pattern] Separated maintenance state into two tables: `maintenance` (current schedule) and `maintenance_completions` (history). Added index on `nextDueAt` for query efficiency. (2026-03-15)
- **Problem solved:** Needed to track both current maintenance tasks and completion history without data loss
- **Why this works:** Normalization prevents update anomalies; completion history is immutable audit trail. Index on nextDueAt is critical for 'what's due soon' queries that drive UI dashboards.
- **Trade-offs:** Requires JOIN on select queries, but enables independent querying of completions without scanning full schedules. Completion history never gets overwritten.

#### [Learned] Health score aggregates 4 equal-weight independent pillars (maintenance, inventory, budget, systems: each 0-25 points) into 0-100 total, rather than weighted formula or single metric. (2026-03-15)
- **Problem solved:** Need single metric representing overall home health from multiple independent factors.
- **Why this works:** Equal weighting is transparent/understandable (each pillar is 25%) and allows independent progress. User can improve budget without touching maintenance. Simpler to explain than weighted formula.
- **Trade-offs:** Equal weights might not match actual importance (maintenance arguably more critical than inventory). Benefit is clarity—users understand which areas impact health equally.

#### [Pattern] LEFT JOINs to vendor/asset tables to gracefully handle missing foreign key data (2026-03-15)
- **Problem solved:** MaintenanceService queries need to return maintenance schedules even when vendor or asset records don't exist yet
- **Why this works:** Allows feature to work with partial data dependencies; doesn't break if vendor/asset features are incomplete or not yet populated. Enables incremental feature rollout.
- **Trade-offs:** Application code must handle null fields for vendor/asset; simpler schema requirements trade off for more complex null-safety in queries

### Synchronous better-sqlite3 API used consistently across all services despite potential scalability limits (2026-03-15)
- **Context:** MaintenanceService and other services use blocking synchronous DB calls rather than async/await
- **Why:** Consistency with existing service architecture in codebase; simpler transactional guarantees; avoids mixing sync/async patterns
- **Rejected:** Async pool (SQLite with async drivers) would be more scalable but break consistency with existing sync services
- **Trade-offs:** Simpler, more consistent codebase vs potential event loop blocking under load; consistency easier to reason about vs harder to scale
- **Breaking if changed:** Mixing sync and async service calls creates blocking in async request handlers, starving other requests

#### [Pattern] Computed date buckets (overdue/thisWeek/thisMonth/upToDate) via ISO date arithmetic in getDueSummary() rather than storing pre-computed fields (2026-03-15)
- **Problem solved:** DueSummary query buckets schedules using date comparisons at query time, not storing summary counts
- **Why this works:** Summaries are always fresh; no cache invalidation logic needed; works correctly across time boundaries without periodic recalculation
- **Trade-offs:** Query-time computation cost vs always-correct data; slightly slower reads vs no invalidation complexity

#### [Pattern] Amounts stored in cents (integers) requiring division by 100 for display with Intl.NumberFormat (2026-03-15)
- **Problem solved:** Storing monetary values as cents avoids floating-point precision errors (classic financial software pattern)
- **Why this works:** Integer arithmetic is exact; floating-point ($123.45 as 123.45) can lose precision in calculations. Every display location must divide by 100.
- **Trade-offs:** Mathematically sound and queryable but creates a distributed conversion responsibility - easy to forget a division somewhere and show cents as dollars

### Single shared homemaker.db SQLite database for all modules (not separate DB per module) (2026-03-15)
- **Context:** Architecture section specifies shared DB with WAL mode, foreign keys enabled, constructor injection across all modules
- **Why:** Enables atomic transactions across modules (e.g., inventory decrement + maintenance trigger + XP award all succeed or all fail). Simpler deployment (one DB connection pool). Consistency is managed at database level.
- **Rejected:** Multiple DBs per module (microservices pattern) would allow independent scaling but lose ACID guarantees across modules; would require distributed transactions or eventual consistency
- **Trade-offs:** Single point of contention (DB lock) vs modularity. Schema changes require coordination across team.
- **Breaking if changed:** If you split to separate DBs, operations like 'asset deleted, remove maintenance tasks, deduct XP' become non-atomic; inconsistent state becomes possible. Foreign key constraints enforcing relationships between modules stop working.

#### [Pattern] SQLite schema stores only encrypted bytes—no schema columns for secret_category, secret_value, etc. All metadata and content encrypted together. Decryption happens in application code, never in database queries. (2026-03-15)
- **Problem solved:** Vault needs to store secrets securely without database having access to plaintext, even accidentally through query logs or backups.
- **Why this works:** Database itself becomes untrusted—even if database file is leaked, it contains only gibberish. Encryption key never touches database. Prevents SQL injection from exposing secrets.
- **Trade-offs:** Application must handle serialization/deserialization of encrypted payloads. Cannot query secrets by content, only by ID. Indexing limited to non-sensitive fields.

### Aggregation uses SQLite json_extract() + strftime() for server-side GROUP BY hour/day/week, not client-side aggregation (2026-03-15)
- **Context:** Endpoint needs historical data aggregated (avg/min/max/count) over time intervals
- **Why:** Server-side aggregation reduces data transfer and leverages database query optimization. Single query result vs. sending thousands of raw readings to aggregate client-side.
- **Rejected:** Client-side aggregation would fetch all raw readings (network overhead, memory usage client-side); hard-coded intervals are simpler than dynamic SQL building
- **Trade-offs:** Requires understanding SQLite JSON functions and strftime; fixed intervals (hour/day/week) vs. unlimited flexibility
- **Breaking if changed:** If someone tries to remove json_extract or strftime, aggregation endpoint breaks. Changing interval enum requires schema design changes.

### Quest status tracked in single table (active_quests) with `status` enum column and `completedAt` nullable timestamp, rather than separate 'completed_quests' table or soft-delete pattern. (2026-03-15)
- **Context:** Table schema extended with `status` (pending|in-progress|completed|expired) and `completedAt` fields for lifecycle tracking.
- **Why:** Single-table approach keeps quest history queryable without joins; nullable `completedAt` provides completion timestamp for achievements/stats; status column makes query filtering simple.
- **Rejected:** Separate completed_quests table (requires INSERT/DELETE + triggers), or soft-delete pattern (wastes space, confuses 'deleted' semantics with 'completed').
- **Trade-offs:** Single table is simpler for the common case (what quests is user doing now?) but if need full quest history analytics, would require archival process. Status enum provides type safety but any new status requires schema migration.
- **Breaking if changed:** Removing `completedAt` loses completion timestamp data (can't build 'achievements' timeline); removing status column forces discriminating via table membership.

#### [Pattern] Time-series aggregation support (getHistoryAggregated with min/max/avg/sum): query methods typed for computed summaries, not just raw readings (2026-03-15)
- **Problem solved:** SQLite sensor_readings table accumulates rapidly; historical queries need to span weeks/months
- **Why this works:** Raw reading counts grow unsustainably; aggregation at query time allows efficient storage and analysis without pre-computation
- **Trade-offs:** Query-time computation is slower but flexible; keeps code simple and data lossless