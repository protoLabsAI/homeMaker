---
tags: [performance]
summary: performance implementation decisions and patterns
relevantTo: [performance]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# performance

#### [Pattern] Exponential backoff reconnection uses sequence 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped at 60s). After reaching cap, reconnect is attempted every 60s. (2026-03-15)
- **Problem solved:** WebSocket connection drops due to network failure or server restart
- **Why this works:** Exponential backoff prevents resource exhaustion and server abuse during prolonged outages. Cap at 60s balances fast recovery (not waiting hours) with reasonable server load. Reaching 60s cap takes 127 seconds, then attempts every 60s thereafter.
- **Trade-offs:** 60s cap means max 60s recovery time after HA comes back online (fast), but prevents unreasonably long reconnect delays. Without cap, would need manual intervention to reconnect after extended outages.