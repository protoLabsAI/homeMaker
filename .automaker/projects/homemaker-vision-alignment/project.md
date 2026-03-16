# homeMaker Vision Alignment

Strip dev platform UI noise, refine AI agents for home research/reporting, and establish homeMaker as a focused home management hub for two households.

**Status:** active
**Created:** 2026-03-16T01:05:31.960Z
**Updated:** 2026-03-16T01:05:50.951Z

## PRD

### Situation

homeMaker is a fork of protoLabs Studio, repurposed as a self-hosted home management hub for two households (4 users total). The app has 11 working home management modules (dashboard, board, calendar, todo, notes, maintenance, sensors, inventory, budget, vault, vendors) plus gamification and integrations (Home Assistant, weather). However, the UI still exposes 13+ dev platform routes inherited from protoLabs Studio that create noise and confusion for non-technical users.

### Problem

The sidebar and route structure exposes dev-only tools (file editor, GitHub issues/PRs, designs editor, ceremonies, analytics, system view, project management, spec editor, stream overlay) alongside home management modules. This creates a cluttered, confusing experience — especially for non-technical household members. Additionally, the AI agent system is configured for code generation tasks, not home research and reporting. The spec.md has empty TODO placeholders with no product definition.

### Approach

Three milestones: (M1) Strip all dev-platform routes, views, and nav items from the UI — keep server-side agent infrastructure intact since protoLabs Studio uses it to build homeMaker. (M2) Refine AI agent behavior for home use — update prompts, task creation UX, and agent definitions to default to research-and-report mode for home topics (DIY, product comparisons, maintenance advice). (M3) Establish product identity — fill spec.md, rename Family Chat to Household Chat, ensure all user-facing strings reflect home management context.

### Results

A clean, focused UI where every sidebar item serves home management. Non-technical household members see only relevant modules. AI agents default to researching home topics and delivering reports. Product identity is clearly defined and documented. The dev platform infrastructure remains intact under the hood for building homeMaker itself.

### Constraints

Keep all server-side services intact — the agent pipeline powers both home AI and development. Keep the board as a dual-purpose tool (house projects use the same kanban as dev features). Budget and vault modules stay as-is (YNAB and Infisical integrations are future, low priority). Four users across two households, self-hosted behind Tailscale, no cloud sync.

## Milestones

### 1. M1: Strip Dev Platform UI

Remove all dev-only routes, view components, and sidebar nav items. Keep server-side services intact. The goal is a clean sidebar with only home management modules.

**Status:** pending

#### Phases

1. **Phase 1: Remove Dev Routes and Nav Items** (medium)
2. **Phase 2: Clean Up Orphaned View Components** (medium)

### 2. M2: Home AI Agent Refinement

Reconfigure the AI agent system to default to home research and reporting instead of code generation. Update prompts, agent definitions, and board UX to reflect home management context.

**Status:** pending

#### Phases

1. **Phase 1: Home Research Agent Prompts** (medium)
2. **Phase 2: Board UX for Home Projects** (medium)

### 3. M3: Product Identity

Establish homeMaker's product identity in code and documentation. Fill in the empty spec, rename dev-inherited labels, ensure all user-facing copy reflects home management.

**Status:** pending

#### Phases

1. **Phase 1: Spec and User-Facing Copy** (small)
