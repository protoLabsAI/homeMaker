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

#### [Gotcha] selectedIndex initialized to -1 (not 0), representing explicit 'no selection' state (2026-03-11)
- **Situation:** Hook needs to communicate whether a command is pre-selected in the dropdown
- **Root cause:** -1 is semantically clearer than 0; 0 would auto-select first item on activation, causing unexpected behavior
- **How to avoid:** Downstream UI components must handle -1 specially; can't directly use `commands[selectedIndex]` without bounds check