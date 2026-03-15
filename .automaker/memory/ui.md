---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 0
  successfulFeatures: 0
---
# ui

#### [Gotcha] selectedIndex initialized to -1 (not 0), representing explicit 'no selection' state (2026-03-11)
- **Situation:** Hook needs to communicate whether a command is pre-selected in the dropdown
- **Root cause:** -1 is semantically clearer than 0; 0 would auto-select first item on activation, causing unexpected behavior
- **How to avoid:** Downstream UI components must handle -1 specially; can't directly use `commands[selectedIndex]` without bounds check

#### [Pattern] Deduped recent server URLs array (max 10) prevents duplicate entries from repeated 'set server' clicks (2026-03-11)
- **Problem solved:** Users switching between servers frequently (dev/staging/prod workflows) benefit from quick-access list
- **Why this works:** Deduplication indicates expected user behavior (clicking 'set server' multiple times with same URL). Size limit (10) balances UX density with memory.
- **Trade-offs:** Gained: clean recent list UX; lost: ability to see frequency of server usage

#### [Gotcha] selectedIndex normalized from −1 (hook state) to 0 (view state) when dropdown active. Normalization happens in the slashCommands prop object, not in hook state. (2026-03-11)
- **Situation:** Hook uses −1 as sentinel for 'closed/not selected' state, but when dropdown opens, rendering with −1 selected looks broken (nothing highlighted)
- **Root cause:** Avoids mutating hook state for view concerns. Hook can keep −1 meaning 'closed', view can normalize to 0 for rendering without the hook knowing. Separates state management from presentation.
- **How to avoid:** Simple normalization logic in wrapper keeps concerns clean, but adds implicit contract: ChatInput must handle 0-indexed selection

### Command selection inserts '/{cmd.name} ' with trailing space into input. User can immediately type arguments without manually adding space. (2026-03-11)
- **Context:** User selects '/ava' command; needs to be able to type arguments like '/ava help me debug' seamlessly
- **Why:** Frontend handles UI insertion only. Server handles actual command expansion/parsing. Trailing space is a UX convention—reduces friction for common case (command + args) while keeping parsing flexible on backend.
- **Rejected:** Insert without space '/ava'; insert full expanded command like '/ava [args placeholder]'; leave it to user to add space
- **Trade-offs:** Single-space assumption simplifies frontend but assumes backend can parse any command+space+args pattern. More sophisticated arg handling (multiple flags, etc.) stays on server.
- **Breaking if changed:** Removing trailing space requires users to manually add space—breaks smooth argument typing UX

#### [Pattern] Wrap-around navigation using modulo arithmetic: (index − 1 + count) % count for up, (index + 1) % count for down (2026-03-11)
- **Problem solved:** User navigates with ArrowUp/Down through command list; at bottom of list, expect Up to cycle to top
- **Why this works:** Standard UI expectation for lists: reaching the end cycles back instead of stopping dead. Modulo math handles both boundaries with single formula. Makes navigation feel predictable and continuous.
- **Trade-offs:** Slightly more complex math, but significantly smoother UX. Requires count > 0 validation (guarded by early return in navigate function)

#### [Gotcha] Keyboard interception (ArrowUp/Down/Tab/Enter/Escape) happens in ChatInput, not in SlashCommandDropdown. ChatInput must re-emit as handler calls to parent wrapper. (2026-03-11)
- **Situation:** Multiple keyboard handlers (navigation, selection, closing) need to coordinate between textarea and dropdown. Interception can't happen in dropdown alone.
- **Root cause:** Textarea is the focus target, so keyboard events bubble from there. ChatInput owns the keyboard context and must intercept first. Handlers then call hookResult methods (select, navigate) back through the interface.
- **How to avoid:** Keyboard logic lives in ChatInput even though it's for dropdown—couples them slightly. Alternative (dropdown owned state) would require ChatInput to be uncontrolled dropdown parent. Current approach simpler.

#### [Pattern] Graceful degradation: Badge shows `ceremonyLabel` when present, falls back to `config.label` for events without ceremony-specific labeling. (2026-03-13)
- **Problem solved:** Not all ceremony events might have ceremony-specific labels; some might be generic config labels.
- **Why this works:** Handles incomplete data gracefully. Allows gradual adoption of ceremony labeling without requiring migration of all events.
- **Trade-offs:** UI logic simpler with optional data; badge always has a label even if not ceremony-specific.

### Use config object (ARTIFACT_CONFIG) to map artifact type → icon, color, label; enable per-type customization without conditional branches (2026-03-13)
- **Context:** Five artifact types (Standup, Ceremony Report, Changelog, Escalation, Research Report) each need distinct icon, visual color, and display label. Risk: adding new types requires code changes in multiple places.
- **Why:** Centralized configuration reduces conditional logic in components. Adding a new type requires only one change (ARTIFACT_CONFIG). Config lookup is O(1), scales without performance impact.
- **Rejected:** Inline icon selection with switch/if statements in ArtifactGroup (scatters type logic across components); hardcoded styling (loses visual hierarchy)
- **Trade-offs:** More indirection (lookup table vs inline), but significantly cleaner component code. Requires discipline to update config when adding types.
- **Breaking if changed:** Removing config fallback (DEFAULT_ARTIFACT_CONFIG) breaks graceful handling of unknown types

#### [Pattern] Implement feature with graceful degradation: download button works with real content or metadata fallback, not blocked by upstream enrichment (2026-03-13)
- **Problem solved:** Download-as-markdown feature is valuable immediately even though parent hasn't fetched real ceremony report content yet. Without fallback, feature would be useless until parent implements enrichment.
- **Why this works:** Keeps feature partially useful during development of parent enrichment. Reduces coordination friction: artifact viewer can ship standalone; parent can add content enrichment independently.
- **Trade-offs:** Download provides metadata instead of full report initially (lower value), but unblocks user-facing feature. Creates technical debt: metadata-based downloads become harder to remove later if UX wants them deprecated.

### Starter kit selection is optional (no default) and uses toggle pattern (click to select, click again to deselect), preserving blank-project flow (2026-03-15)
- **Context:** Could default to 'docs' kit, or use radio buttons, or require selection. Instead made optional with toggle.
- **Why:** Explicit opt-in preserves backward compatibility—existing users expecting blank projects unchanged. Toggle UX is lightweight; no dedicated deselect button needed. Reduces cognitive load for users who want blank project.
- **Rejected:** Defaulting to 'docs' would increase template adoption but breaks expectation for blank projects. Required radio selection increases friction for blank-project path.
- **Trade-offs:** Simpler UX (toggle) vs. clearer multi-select semantics (checkboxes). Optional path vs. higher template adoption. Fewer clicks to skip templates vs. explicit mutual exclusivity.
- **Breaking if changed:** If logic later assumes a starter kit is always present, optional starterKit field becomes a problem. Schema migrations needed if making selection required.

#### [Pattern] Icon selection aligned to home management domain: Home (dashboard), MessageSquare (chat), CalendarDays, ListTodo, NotebookPen instead of original dev-focused Palette, FolderKanban, Network, FileText icons (2026-03-15)
- **Problem solved:** Rebranding from protoLabs dev-focused UI to homeMaker home management application
- **Why this works:** Visual metaphors reinforce domain identity and improve cognitive load for end users. Home icon for dashboard, Chat bubble for messaging are universally understood in home management context.
- **Trade-offs:** Easier: clearer affordances for home users. Harder: lost dev-focused visual language if tool ever needs to serve dev audience again.

#### [Gotcha] All button elements must use Button component from @protolabsai/ui/atoms, never bare <button> HTML tags (2026-03-15)
- **Situation:** UI library has strict conformance requirement (per ui-standards.md) that native HTML breaks
- **Root cause:** Design system consistency; bare buttons don't respect theme/accessibility/styling conventions of component library
- **How to avoid:** Must import Button component everywhere = more boilerplate, but ensures consistent styling/accessibility across app

#### [Pattern] Filter chips implemented as Button variant='default'/'outline' with rounded-full className for toggle state management (2026-03-15)
- **Problem solved:** Inventory view needs category and location filter chips that toggle selected/unselected state
- **Why this works:** Button variants provide semantic styling (outline for unselected, default for selected); rounded-full provides chip appearance without custom component
- **Trade-offs:** Reusing Button simplifies code but ties filter appearance to Button component evolution; if Button changes, filters visually change

#### [Pattern] Optional form fields in add-asset-dialog hidden behind collapsible toggle to reduce cognitive load on required-only view (2026-03-15)
- **Problem solved:** Asset creation has many optional fields (warranty details, maintenance notes, etc.) but primary path only needs name/category/location
- **Why this works:** Progressive disclosure pattern improves UX for common case (simple asset) while allowing power users to add details; balances completeness vs simplicity
- **Trade-offs:** Users add details intentionally (good) vs hidden fields might be missed; implementation requires form state splitting

#### [Gotcha] PanelHeader.actions expects PanelHeaderAction[] array, not ReactNode. Must use 'extra' prop for arbitrary ReactNode content in header. (2026-03-15)
- **Situation:** Building ScheduleDetailPanel slide-out sheet with header actions
- **Root cause:** PanelHeader has typed API that enforces specific action structure for consistent UX; doesn't accept generic children
- **How to avoid:** Strict typing prevents flexible layouts but ensures consistency; requires knowing about 'extra' prop workaround

#### [Pattern] DueSummary uses clickable color-coded cards (red overdue, yellow due-soon, blue due-month, green up-to-date) that filter tab selection rather than separate views. (2026-03-15)
- **Problem solved:** MaintenanceView needs to show maintenance status at-a-glance and enable filtering
- **Why this works:** Summary cards provide visual status overview; making them clickable for filtering eliminates separate tab UI and maintains shared state across view
- **Trade-offs:** Faster filter switching and smaller code footprint, but card interactivity is non-obvious (users must discover they're clickable); makes card purpose dual (summary + filter control)

### Sidebar XP bar remains visible in both expanded and collapsed sidebar states (2026-03-15)
- **Context:** XP bar integrated into sidebar with design supporting both expanded (full width) and collapsed (compact) display modes
- **Why:** Gamification is primary user goal, XP progress is always-visible signal of progress. Keeps motivation visible even in collapsed state
- **Rejected:** Could have hidden XP bar entirely in collapsed state to save space, or only shown in expanded state
- **Trade-offs:** Takes sidebar space in both states, but communicates XP progress continuously without requiring sidebar expansion
- **Breaking if changed:** If XP bar is removed or hidden in collapsed state, users lose visibility into gamification progress when sidebar is minimized

#### [Pattern] Portal-based full-screen overlay for level-up animation escapes parent layout constraints via createPortal(component, document.body) (2026-03-15)
- **Problem solved:** Level-up overlay needs true full-screen coverage without being constrained by parent component's stacking context or overflow settings
- **Why this works:** React components in tree are constrained by parent position/overflow/z-index; portaling to document.body removes these constraints for unobstructed full-screen experience
- **Trade-offs:** Portal adds DOM node outside React tree (slight mental model complexity) but guarantees full-screen rendering regardless of parent layout

#### [Pattern] Sonner toast position override per-call (toast.custom(msg, { position: 'top-center' })) enables multi-zone toast system within single Toaster instance (2026-03-15)
- **Problem solved:** Different celebrations need different visual zones: bottom-right for XP/streak toasts, top-center for achievement banner
- **Why this works:** Single Toaster instance supports per-call position override via toast.custom()—avoids DOM bloat and CSS scope conflicts of multiple Toaster instances
- **Trade-offs:** Simpler DOM and CSS but requires knowing Sonner's override API; multiple instances would be more obvious but heavier

### Conditional loading indicator based on sensor presence: skeleton only when `isLoading && sensors.length === 0`, subtle corner spinner only when `isLoading && sensors.length > 0`. Different UX signals for initial data load vs background refresh. (2026-03-15)
- **Context:** Showing loading state during both initial data fetch and periodic polling without jarring the user with repeated skeletons
- **Why:** Initial load with no data requires immediate user feedback (skeleton). Background refresh with existing data should not interrupt user (subtle corner spinner). Skeleton re-rendering during each 10s poll would be visually jarring and break user focus. Conditioning on `sensors.length` distinguishes between 'no data context' and 'refreshing known data'.
- **Rejected:** Show skeleton on all loads (jarring UX during polls), show nothing (users don't know refresh is happening), show toast (too intrusive)
- **Trade-offs:** More conditional logic in component vs better UX. Spinner visibility is subtle but unambiguous.
- **Breaking if changed:** Removing the `sensors.length` condition causes skeleton flashing every 10s, destroying usability during real-time polling.

### Offline sensor visibility using `opacity-50` preserves grid layout and context while providing visual distinction. Sensors remain in grid flow, grayed out but present. (2026-03-15)
- **Context:** Displaying offline sensors without losing information density or disrupting grid layout
- **Why:** Opacity preserves grid structure (hidden items would break CSS Grid flow), keeps offline sensors visible for context (users see which sensors are down), and provides immediate visual scan (no need to check separate list). Alternative of separate 'offline' section adds complexity and breaks single unified view.
- **Rejected:** Hide offline sensors entirely (loses context and operational visibility), move to separate collapsed section (adds UI complexity), use different row styling (harder to scan visually than opacity shift)
- **Trade-offs:** Slightly harder to distinguish offline sensors than separate section vs preserving clean grid layout and information density
- **Breaking if changed:** Removing opacity makes offline sensors visually identical to online ones (critical operational issue). Hiding them breaks situational awareness for operations.

### Category breakdown uses CSS-only proportional bars instead of a charting library (Recharts, Chart.js) (2026-03-15)
- **Context:** Visualizing spend per category as horizontal stacked bars showing relative proportions
- **Why:** Reduces bundle size (no library overhead), simpler implementation, avoids dependency maintenance. CSS flexbox proportional widths are sufficient for this use case.
- **Rejected:** Chart.js (more features but heavier); Recharts (React-friendly but larger bundle); custom canvas (more powerful but complex)
- **Trade-offs:** Simpler code and smaller bundle vs. limited interactivity (no hover tooltips, no animations, no drill-down). If drill-down or advanced interactions needed later, requires library addition.
- **Breaking if changed:** If requirements change to need interactive features (click category to filter transactions), the CSS-only approach hits a wall

#### [Pattern] Two-tier search: instant client-side filter on loaded entries, with 400ms debounced server fallback if no matches found (2026-03-15)
- **Problem solved:** Search must feel responsive (avoid network latency) but also handle queries where matching entries aren't in current paginated view
- **Why this works:** Client-side search provides snappy UX for common case; debounced server search handles rare case of querying entries not yet fetched without hammering API
- **Trade-offs:** More code complexity for better perceived performance. Debounce timing (400ms) empirically chosen to balance responsiveness vs API cost

#### [Pattern] Category filtering uses fixed tab set with 'Other' catch-all for non-standard categories instead of dynamic tab generation or dropdown (2026-03-15)
- **Problem solved:** 6 named category tabs (Plumber, Electrician, etc.) plus 'Other' for remaining - discovered this approach from UI requirements
- **Why this works:** Fixed tabs provide clean, predictable UX for the happy path. 'Other' defer rare categories without UI complexity
- **Trade-offs:** Simple UX for common cases vs discoverability issue for edge categories; 'Other' tab combines disparate types

#### [Pattern] Used Sheet for read-only detail panel, Dialog for form-based add/edit - semantic distinction between viewing and writing data (2026-03-15)
- **Problem solved:** vendor-detail-panel opens as Sheet, add-vendor-dialog and edit as Dialog from detail panel or grid
- **Why this works:** Clear UX signal: Sheet = temporary reading/browsing (slide-in, secondary), Dialog = focused form entry (modal, primary action). Inherited from maintenance-view pattern
- **Trade-offs:** Consistent UX experience vs must maintain both Sheet and Dialog components; leverages existing Shadcn components effectively

#### [Gotcha] Merge conflict in navigation hooks revealed parallel feature development: vendors (Wrench icon) and vault (KeyRound icon) both needed in sidebar, not exclusive (2026-03-15)
- **Situation:** Feature branch diverged from dev; both branches added different nav items causing UU (both updated) conflict
- **Root cause:** Solution kept both icons—indicates sidebar supports multiple parallel navigation targets. Initial conflict suggested they were competing features when actually complementary.
- **How to avoid:** Manual conflict resolution required understanding of feature interdependencies; teaches that concurrent UI features need coordination

### Client-side sender name persistence in localStorage with key 'household-chat:sender-name' (2026-03-15)
- **Context:** Chat requires sender identification; users should not need to re-enter name on page reload
- **Why:** localStorage survives page reloads and tab closures. No server state required, reducing latency and complexity. Key scoped to feature ('household-chat:') prevents collision with other localStorage keys.
- **Rejected:** Query parameter (lost on reload, visible in URL). Server session state (adds backend complexity, doesn't survive browser restart). No persistence (frustrating UX).
- **Trade-offs:** Storage is per-domain and per-browser (not synced across devices), but avoids server state and provides good single-device UX. Vulnerable to localStorage clearing.
- **Breaking if changed:** Removing localStorage fallback requires users to re-enter name repeatedly (poor UX). Changing key name from 'household-chat:sender-name' loses existing user preferences.

### Action selector implemented as button group (variant toggle pattern), not dropdown or form field (2026-03-15)
- **Context:** SensorCard UI shows action choices; COMMAND_ACTIONS array mapped to Button components
- **Why:** Visual affordance clear; fast selection for small action set; immediate feedback on current selection
- **Rejected:** Dropdown/Select - takes less space but hides options; radio group - more semantic but less visual
- **Trade-offs:** UX clarity for 2-3 actions; scales poorly if actions grow to 10+ - layout breaks, becomes unusable
- **Breaking if changed:** If actions grow, UI requires redesign; changing to Select component alters component API for SendCommandDialog

#### [Pattern] SendCommandDialog owns mutation state (sendCommand, pending status) and coordinates dialog lifecycle (onOpenChange callback) (2026-03-15)
- **Problem solved:** Dialog component handles React Query mutation, loading state, error display, and dialog open/close
- **Why this works:** Encapsulates submission flow; keeps SensorCard simple; Dialog becomes self-contained feature
- **Trade-offs:** SensorCard simplified; Dialog component becomes stateful - harder to test in isolation, couples to React Query

#### [Pattern] Native APIs (dialog, notification, tray) all provide web browser fallbacks in same module (2026-03-15)
- **Problem solved:** Single codebase needs to work as both desktop (Tauri) and web app without conditional imports
- **Why this works:** Progressive enhancement: graceful degradation enables web-first development/testing without desktop build; detects platform at runtime
- **Trade-offs:** More code per module but enables same feature set on web (reduced) and desktop (full); simplifies testing