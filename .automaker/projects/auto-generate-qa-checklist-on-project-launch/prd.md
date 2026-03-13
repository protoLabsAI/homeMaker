# PRD: Auto-Generate QA Checklist on Project Launch

## Situation
Projects have milestones and phases with acceptance criteria defined at planning time. When a project launches and agents start implementing features, users have no structured way to know what to test. QA guidance exists in the acceptance criteria but isn't surfaced in a usable format through the UI. A QA.md file was previously created in .automaker/projects/*/QA.md — a dotfile directory not accessible through the product.

## Problem
QA testing guidance is buried in project JSON files and hidden dotfile directories. Users launching a project have no checklist in the UI telling them what to verify milestone by milestone. The Resources tab already has a Documents section with a text editor, but it starts empty.

## Approach
Add a `generateQaDoc()` method to `ProjectLifecycleService` that reads the project's milestones and phases, builds a markdown QA checklist from each phase's acceptance criteria, and saves it as a ProjectDocument via `projectService.createDoc()`. Call this method from `launch()` after features are confirmed, before auto-mode starts. If QA doc creation fails, log the error but don't fail the launch.

## Results
A 'QA Checklist' document automatically appears in Resources → Documents when a project launches. It is organized by milestone and phase, with each acceptance criterion as a markdown checkbox. Users can view, edit, and check off items. No new UI required — the Resources tab already renders the content. Generation is idempotent: skipped if a QA Checklist doc already exists for this project.

## Constraints
No UI changes — Resources tab already supports the document format,No new types or packages — all existing infrastructure,Must not block launch if doc generation fails (fire-and-forget or try/catch),Idempotent: skip generation if a doc titled 'QA Checklist' already exists,Skip gracefully if project has no milestones or no phases with acceptance criteria
