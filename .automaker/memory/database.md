---
tags: [database]
summary: database implementation decisions and patterns
relevantTo: [database]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 3
  referenced: 3
  successfulFeatures: 3
---
# database

#### [Pattern] INSERT OR IGNORE with composite PRIMARY KEY (sensorId, receivedAt) to handle concurrent/duplicate sensor readings at same millisecond timestamp (2026-03-15)
- **Problem solved:** Sensor readings from external sources may arrive at identical timestamps, violating unique constraints without graceful handling
- **Why this works:** Idempotent persistence prevents service crashes on race conditions; allows system to accept legitimate duplicate readings without crashing
- **Trade-offs:** Silent failure on duplicates (harder to audit actual race conditions) vs crash-free operation and graceful degradation

### Entity sync state persisted in GlobalSettings.homeAssistant.entitySyncMap as Record<string, boolean> instead of creating dedicated database table (2026-03-15)
- **Context:** Need durable per-entity sync preferences without schema migration
- **Why:** Avoids database migration, version management, and new tables. Reuses existing GlobalSettings persistence endpoint. Schema-free approach handles dynamic HA entity additions.
- **Rejected:** New HA_ENTITY_SYNC table with foreign keys and repository layer
- **Trade-offs:** Schema flexibility but less queryable. Sync state mixed into settings object rather than separate concern. Cannot enforce constraints at DB level.
- **Breaking if changed:** Moving to separate table would require migration logic and backward compatibility handling for existing GlobalSettings.