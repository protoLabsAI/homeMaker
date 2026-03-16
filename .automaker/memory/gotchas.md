---
tags: [gotchas]
summary: gotchas implementation decisions and patterns
relevantTo: [gotchas]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 13
  referenced: 10
  successfulFeatures: 10
---
# gotchas

#### [Gotcha] getHistory(), getHistoryAggregated(), cleanupOldReadings() methods existed but referenced undefined types (SensorReadingRow, AggregatedRow) and uninitialized constant (DEFAULT_RETENTION_DAYS) (2026-03-15)
- **Situation:** Implementation was incomplete—methods fully coded but infrastructure types/constants never declared, only discovered during DB wiring
- **Root cause:** Suggests incomplete initial implementation or abandoned refactoring; types were reference-only, preventing compilation until injected
- **How to avoid:** Adding types unblocks existing logic (good discovery) vs reveals code smell and incomplete checklist (risk sign)

#### [Gotcha] Server-side connection test required to avoid CORS failures on local Home Assistant instances (2026-03-15)
- **Situation:** Browser cannot probe local network HA WebSocket directly due to browser Same-Origin Policy
- **Root cause:** Browsers block cross-origin requests to local IPs; server-side test runs outside browser sandbox
- **How to avoid:** Adds server endpoint, but provides reliable configuration validation without user confusion

#### [Gotcha] Auto-generated template preamble ('Fill in placeholder sections marked with TODO') persists after all TODO items are completed and requires manual cleanup. (2026-03-16)
- **Situation:** spec.md had auto-generated preamble line referencing TODO items. After filling all sections, preamble became inaccurate and had to be manually removed.
- **Root cause:** Template automation generated the preamble once; it doesn't monitor content and auto-remove itself when conditions change. Humans filled in content but didn't auto-clean the preamble.
- **How to avoid:** Simple workaround (manual removal) vs. added automation; manual removal is one-line edit vs. commit-time validation script