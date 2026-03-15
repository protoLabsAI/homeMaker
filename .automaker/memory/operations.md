---
tags: [operations]
summary: operations implementation decisions and patterns
relevantTo: [operations]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# operations

#### [Gotcha] Cleanup scheduled at fixed 3 AM daily; does not adapt to actual traffic patterns or custom retention period changes (2026-03-15)
- **Situation:** SENSOR_HISTORY_RETENTION_DAYS is environment variable, but cron schedule is hardcoded at 3 AM
- **Root cause:** Simple, predictable; assumes 3 AM is low-traffic time. Avoids complexity of dynamic scheduling.
- **How to avoid:** Simplicity vs. robustness; if traffic is high at 3 AM for some customers, cleanup will impact performance