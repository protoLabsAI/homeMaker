---
tags: [data]
summary: data implementation decisions and patterns
relevantTo: [data]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 1
  successfulFeatures: 1
---
# data

#### [Gotcha] Precipitation detection requires BOTH absolute check (precipitation > 0) AND probabilistic check (precipitationProbability > 30%) to be reliable (2026-03-15)
- **Situation:** Implementing isPrecipitationExpected() helper for maintenance scheduling; single check was unreliable with real weather API data
- **Root cause:** OpenWeatherMap data can have precipitation=0 but high probability, or vice versa; both fields have different meanings. Using only one misses rain events.
- **How to avoid:** Easier: explicit dual logic is clear. Harder: more complex than single threshold; different from typical rain detection patterns

#### [Pattern] Forecast aggregation strategy: 3-hour intervals aggregated to daily summaries with preference for noon readings over other times (2026-03-15)
- **Problem solved:** OpenWeatherMap free tier returns 5-day forecast in 3-hour buckets; need to expose as daily summaries to maintenance scheduler
- **Why this works:** Noon readings most representative of day's conditions; avoids midnight/early-morning anomalies; reduces data volume while preserving accuracy
- **Trade-offs:** Easier: daily API contracts simpler. Harder: loses intra-day variation; if weather changes dramatically mid-day, missed in daily summary