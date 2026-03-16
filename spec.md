# homeMaker — Spec

## Description

<p align="center">   <img src="apps/ui/public/readme_logo.svg" alt="protoLabs Studio" height="80" /> </p>

## Tech Stack

- TypeScript 5.9.3
- react 19.2.3
- vite 7.3.0
- Tailwind CSS 4.1.18
- Express
- sqlite
- npm
- turbo
- Vitest
- Playwright

## Architecture

**Type**: Monorepo (turbo)

**Packages:**

- `apps/server` — @protolabsai/server (app)
- `apps/ui` — @protolabsai/app (app)
- `libs/dependency-resolver` — @protolabsai/dependency-resolver (package)
- `libs/error-tracking` — @protolabsai/error-tracking (package)
- `libs/flows` — @protolabsai/flows (package)
- `libs/git-utils` — @protolabsai/git-utils (package)
- `libs/model-resolver` — @protolabsai/model-resolver (package)
- `libs/observability` — @protolabsai/observability (package)
- `libs/pen-parser` — @protolabsai/pen-parser (package)
- `libs/platform` — @protolabsai/platform (package)
- `libs/prompts` — @protolabsai/prompts (package)
- `libs/spec-parser` — @protolabsai/spec-parser (package)
- `libs/templates` — @protolabsai/templates (package)
- `libs/tools` — @protolabsai/tools (package)
- `libs/types` — @protolabsai/types (package)
- `libs/ui` — @protolabsai/ui (package)
- `libs/utils` — @protolabsai/utils (package)
- `packages/create-protolab` — create-protolab (package)
- `packages/mcp-server` — @protolabsai/mcp-server (package)
- `packages/setup-cli` — @protolabsai/setup (package)

## Key Dependencies

- @anthropic-ai/claude-agent-sdk: 0.2.36
- @modelcontextprotocol/sdk: 1.26.0
- @openai/codex-sdk: 0.98.0
- @sentry/electron: 5.6.0
- @sentry/node: 8.47.0
- @sentry/types: 8.55.0
- @sentry/vite-plugin: 5.1.0
- @types/dagre: 0.7.53
- cross-spawn: 7.0.6
- dagre: 0.8.5
- langsmith: 0.4.12
- rehype-sanitize: 6.0.0
- tree-kill: 1.2.2

---

## Product Goals

- Provide a single self-hosted interface for managing all household information, schedules, and decisions
- Enable AI research agents to assist with home decisions — comparing products, planning renovations, researching contractors — so homeowners can decide rather than dig
- Reduce household cognitive load by centralizing maintenance, budget, inventory, IoT sensors, and scheduling in one place
- Keep all household data private and local — no cloud dependency, no third-party data access, Tailscale-only

## Target Users

- **Primary**: Small households (2–4 people across 1–2 households) who are comfortable with self-hosting and want AI assistance for home decisions without sacrificing data privacy
- **Secondary**: Tech-savvy homeowners running Home Assistant or other local smart-home infrastructure who want a unified management layer on top

## Key Workflows

### Workflow 1: AI-Assisted Home Research

1. Add a task to the board (e.g., "Research best water heater for a 3-bedroom home under $800")
2. AI research agent picks up the task, runs web searches, and compares options
3. Agent delivers a structured summary with recommendations and trade-offs
4. Homeowner reviews the summary and makes the final decision

### Workflow 2: Maintenance Scheduling

1. Define recurring home obligations (HVAC filter every 90 days, gutter cleaning every 180 days)
2. System auto-calculates next due dates from last completion date
3. Upcoming tasks surface in the calendar and dashboard with countdown timers
4. Mark tasks complete; due date rolls forward automatically; completion history is preserved

### Workflow 3: Home Inventory Tracking

1. Add home assets (appliances, electronics, tools) with purchase date, price, and warranty info
2. Link assets to IoT sensors for automated status monitoring
3. Receive 30-day and 7-day warranty expiration warnings
4. Asset data feeds the Home Health Score's Inventory pillar (20%)

### Workflow 4: Household Budget Management

1. Log income, expenses, and bills by category (groceries, utilities, repairs, etc.)
2. Review monthly summaries and category breakdowns
3. Set budget targets; track actual vs. target spending
4. All data stored locally in SQLite — no bank integrations required

## Constraints

- **Technical**: Self-hosted deployment only; Tailscale-only access (not designed for public internet exposure); SQLite for all persistence (no external database required); Node.js 22+; single `homemaker.db` shared across all services
- **Business**: Designed for 2–4 users across 1–2 households; no multi-tenant architecture; no paid cloud services required beyond an Anthropic API key for AI features
- **Operational**: Single-instance deployment on a home server, NAS, or always-on machine; Docker + Tailscale is the recommended production setup; access from any Tailscale device at `http://homemaker:8578`
