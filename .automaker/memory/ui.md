---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# ui

#### [Gotcha] ErrorState component expects `error` prop, but pre-existing inventory-view.tsx incorrectly uses `message` prop (2026-03-15)
- **Situation:** Fixed type error when building VendorsView by correcting ErrorState prop from `message` to `error`
- **Root cause:** Component API inconsistency in codebase — ErrorState molecule is typed to accept error: string, not message
- **How to avoid:** Correct prop name maintains API contract; existing inventory-view has latent type error suggesting API design confusion

#### [Pattern] HA entities loaded on-demand via 'Discover' button instead of auto-loading when settings page opens (2026-03-15)
- **Problem solved:** Settings page load time when HA may be unconfigured, slow, offline, or unreachable
- **Why this works:** Defers expensive network call to explicit user action. Prevents slow/hanging settings page for users without HA or with slow connections.
- **Trade-offs:** Faster settings page load, but requires additional manual user action. Users won't see discovered entities until they click Discover.

#### [Pattern] Conditional placeholder text (research mode → example 'Research best smart thermostat...', code mode → 'Describe the feature...') to guide user task framing (2026-03-16)
- **Problem solved:** User can toggle task type; placeholder should show different expectations for each
- **Why this works:** Placeholder as affordance — shows users what kind of input each mode expects without reading docs; research tasks have fundamentally different semantics than feature specs
- **Trade-offs:** Small win in UX clarity; requires conditional rendering but no performance cost

#### [Gotcha] HOME_CATEGORIES constant must be defined outside component function, not inline (2026-03-16)
- **Situation:** When adding default home categories to autocomplete suggestions, initial attempt to define HOME_CATEGORIES inside component caused stale closure in useMemo
- **Root cause:** useMemo dependency array comparison—if HOME_CATEGORIES is inline, it's a new array object each render, causing useMemo to always recalculate the merged suggestions despite identical values
- **How to avoid:** Moving constant outside adds one line at module scope but prevents unnecessary recalculation and avoids confusing React devtools inspection

### Selective hiding of dev-specific content: removed git branch and PR URL display, but kept category/cost/due date badges (2026-03-16)
- **Context:** Deciding which card fields to hide when presenting board to non-technical home users
- **Why:** Git branch and PR URL are implementation details specific to software development workflow; category/cost/due date are domain-neutral and valuable for home project management
- **Rejected:** Could have hidden all metadata or shown everything unchanged
- **Trade-offs:** More thoughtful UX but requires explicit consideration for each field—easy to miss or over-hide content needed for domain
- **Breaking if changed:** If someone adds new dev-specific fields without hiding them, they'll leak into home user view; conversely, hiding too aggressively removes useful info