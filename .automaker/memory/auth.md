---
tags: [auth]
summary: auth implementation decisions and patterns
relevantTo: [auth]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# auth

### Auth failures (auth_invalid message) set _destroyed=true to permanently stop reconnection attempts. Invalid tokens are not retried. (2026-03-15)
- **Context:** WebSocket client receives auth_invalid after sending invalid token to HA
- **Why:** A token that is rejected will not suddenly become valid on retry. Continuous reconnection attempts with an invalid token waste CPU and spam the HA server. Instead, manual reconnect via POST /connect must be called with a corrected token.
- **Rejected:** Generic 'retry on any error' exponential backoff would keep retrying forever with an invalid token
- **Trade-offs:** Stops automatic recovery for auth errors, but prevents wasteful retry loops. Operator must explicitly call POST /connect with corrected credentials.
- **Breaking if changed:** If changed to retry auth failures, would cause continuous failed connection attempts and server spam until the process is restarted

#### [Pattern] Dual-auth mode support for E2E tests: check `/api/auth/status` first to establish session cookie, then fall back to API key authentication if needed (2026-03-16)
- **Problem solved:** Tests must work in both dev environment (with AUTOMAKER_AUTO_LOGIN) and CI environment (with API key auth)
- **Why this works:** Eliminates conditional test code; single approach handles both auth modes by leveraging existing session mechanism
- **Trade-offs:** Makes auth flow more robust but adds one extra request per test suite; removed if auth modes become guaranteed per environment