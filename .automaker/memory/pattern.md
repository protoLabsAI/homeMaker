---
tags: [pattern]
summary: pattern implementation decisions and patterns
relevantTo: [pattern]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 13
  referenced: 8
  successfulFeatures: 8
---
# pattern

#### [Pattern] Role prompt injection uses multiple short-circuit returns: missing assignedRole → '', missing promptFile → '', file-not-found → warn + '', manifest error → warn + ''. Execution never fails due to incomplete role setup. (2026-03-13)
- **Problem solved:** Role prompts are optional—features without assignedRole or with an assignedRole missing promptFile should execute normally.
- **Why this works:** Graceful degradation prioritizes robustness. A missing role file should not block feature execution. Warnings log the issue for debugging.
- **Trade-offs:** Silent failure with logging is forgiving but makes configuration errors hard to detect. User may think a role is applied when it silently fell back to no-role execution.

#### [Pattern] Cache snapshot invalidation must re-capture the baseline (mtime) after invalidation. If baseline is not updated, subsequent file changes won't be detected because mtime comparison will see no delta. (2026-03-13)
- **Problem solved:** Polling compares current file mtime against a stored baseline. If a file changes but baseline is not updated after the first invalidation, the next change looks identical.
- **Why this works:** mtime-based polling requires a moving baseline. Each invalidation must reset the comparison point or false negatives (missed changes) occur on subsequent modifications.
- **Trade-offs:** Slightly more expensive to re-read stat() and update baseline, but ensures robust multi-change detection without missed events.

### Cleanup job emits 'sensor:history-cleanup' event only when result.deleted > 0 (conditional emission) (2026-03-15)
- **Context:** 3 AM daily cron cleanup deletes old readings; needs to broadcast cleanup activity
- **Why:** Avoids event noise from no-op cleanups. Event systems benefit from signal-over-noise; observability tools and subscribers only care when work was done.
- **Rejected:** Emitting unconditionally would spam event bus 7 days/week with 'nothing happened' events
- **Trade-offs:** Cleaner event stream vs. slightly more code (the if condition). Loss of guaranteed heartbeat signal.
- **Breaking if changed:** If code relies on daily cleanup event for health checks (e.g., 'I expect an event every 24h'), it will break on quiet days.