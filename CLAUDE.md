# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What This Is

homeMaker is a domestic home management hub — track house projects, budgets, schedules, IoT sensors, and secrets. Built on the protoLabs Studio platform, it uses AI agents to research, plan, and organize household tasks.

The AI agent pipeline (board, auto-mode, Claude Agent SDK, worktrees) is **core infrastructure**, not legacy. Agents help with both home management tasks (research, planning) and development tasks (building new features for homeMaker itself).

## Philosophy

- **Build it right.** Every line of code should be production-quality from day one.
- **No backward compatibility shims.** When changing an interface, update all consumers immediately.
- **No stubs or placeholders.** Build the real thing or don't build it.
- **Minimal scope.** Default to the smallest, lowest-risk approach unless explicitly asked for more.

## Brand Identity

- **homeMaker** = the product name (always camelCase)
- **@protolabsai/*** = internal package names (preserved from protoLabs Studio lineage, do NOT rename)
- **.automaker/** = internal directory for board data, context files, features (preserved, do NOT rename)

## Git Workflow

Feature branches PR to `main`. Keep it simple — no staging/promotion pipeline needed for a home app.

**Rules:**
- Never push directly to `main`. Always use a PR.
- Before committing, run `git status` and verify only intended files are staged.
- `.automaker/memory/` files are updated by agents. Include memory changes in commits alongside related code changes.

## Common Commands

```bash
# Development
npm run dev:full            # Web mode — UI (:3007) + server (:3008) together
npm run dev:web             # UI only
npm run dev:server          # Backend server only

# Building
npm run build               # Build web application
npm run build:packages      # Build all shared packages (required before other builds)
npm run build:server        # Build server only

# Testing
npm run test                # E2E tests (Playwright)
npm run test:server         # Server unit tests (Vitest)
npm run test:packages       # Shared package tests
npm run test:all            # All tests

# Quality
npm run typecheck           # Full typecheck (UI + server)
npm run lint                # ESLint
npm run format              # Prettier write
npm run format:check        # Prettier check
```

## Architecture

### Monorepo Structure

```
homeMaker/
├── apps/
│   ├── ui/           # React + Vite frontend (port 3007)
│   └── server/       # Express + WebSocket backend (port 3008)
└── libs/             # Shared packages (@protolabsai/*)
    ├── types/        # Core TypeScript definitions
    ├── utils/        # Logging, errors, context loading
    ├── ui/           # Shared UI components — atoms, molecules, theme
    ├── prompts/      # AI prompt templates
    ├── platform/     # Path management, security
    ├── git-utils/    # Git operations & worktree management
    ├── tools/        # Tool definition and registry
    ├── flows/        # LangGraph state graph primitives
    ├── model-resolver/    # Claude model alias resolution
    ├── dependency-resolver/  # Task dependency ordering
    ├── observability/     # Tracing & cost tracking
    └── ...
```

### Key Technologies

- **Frontend**: React 19, Vite 7, TanStack Router, Zustand 5, Tailwind CSS 4
- **Backend**: Express 5, WebSocket (ws), Claude Agent SDK, SQLite
- **Testing**: Playwright (E2E), Vitest (unit)

### Server Architecture

The server (`apps/server/src/`) follows a modular pattern:

- `routes/` - Express route handlers organized by domain (sensors, budget, vault, calendar, etc.)
- `services/` - Business logic (SensorRegistryService, BudgetService, VaultService, AgentService, AutoModeService, etc.)
- `providers/` - AI provider abstraction (Claude via Agent SDK)
- `lib/` - Utilities (events, auth, crypto)
- `server/` - Bootstrap modules (middleware, services, wiring, routes, startup, shutdown)

### Frontend Architecture

The UI (`apps/ui/src/`) uses:

- `routes/` - TanStack Router file-based routing
- `components/views/` - Main view components (board, calendar, sensors, budget, vault, etc.)
- `store/` - Zustand stores with persistence
- `hooks/` - Custom React hooks
- `lib/` - Utilities and API client

## Home Management Modules

### Sensor Registry

`apps/server/src/services/sensor-registry-service.ts` — IoT devices register via REST API and POST periodic readings. The service tracks online/stale/offline state with TTL-based detection.

- Types: `SensorConfig`, `SensorReading`, `SensorState` in `libs/types/src/sensor.ts`
- Routes: `apps/server/src/routes/sensors/`
- Events: `sensor:registered`, `sensor:data-received`

### Context Aggregator

`apps/server/src/services/context-aggregator.ts` — Aggregates all sensor readings into a unified household presence state (headless, afk, idle, active).

### Calendar

`apps/ui/src/components/views/calendar-view/` — Full CRUD event management for household schedules.

### Board (House Projects)

The Kanban board from protoLabs Studio, repurposed for tracking house projects. Tasks flow through: backlog -> in_progress -> review -> done (with blocked as an escape state).

## Import Conventions

Always import from shared packages:

```typescript
import type { Feature, SensorConfig } from '@protolabsai/types';
import { createLogger } from '@protolabsai/utils';
import { getFeatureDir } from '@protolabsai/platform';
```

## Key Patterns

### Adding a New Backend Module

Follow the sensor registry pattern:
1. Define types in `libs/types/src/`
2. Create service in `apps/server/src/services/`
3. Create routes in `apps/server/src/routes/<module>/`
4. Wire into `apps/server/src/server/routes.ts`
5. Add to `ServiceContainer` in `apps/server/src/server/services.ts`

### Adding a New UI View

1. Create view in `apps/ui/src/components/views/<module>-view/`
2. Add route file `apps/ui/src/routes/<module>.tsx`
3. Add nav item in `apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts`

### Event-Driven Architecture

All server operations emit events that stream to the frontend via WebSocket. Events are created using `createEventEmitter()` from `lib/events.ts`.

### Feature Status System

5-status system for all board tasks:

```
backlog -> in_progress -> review -> done
              |             |
           blocked <--------+
```

### Context Files

Project-specific rules are stored in `.automaker/context/` and automatically loaded into agent prompts via `loadContextFiles()` from `@protolabsai/utils`.

### Model Hierarchy for Auto-Mode

| Model      | Use Case                        | Triggered By                        |
| ---------- | ------------------------------- | ----------------------------------- |
| **Opus**   | Complex research, architecture  | `complexity: 'architectural'`       |
| **Sonnet** | Standard tasks (default)        | `complexity: 'medium'` or `'large'` |
| **Haiku**  | Quick lookups, simple tasks     | `complexity: 'small'`               |

### Feature Flags

Single source of truth: `DEFAULT_FEATURE_FLAGS` in `libs/types/src/global-settings.ts`. When adding a new flag:
1. Add to `FeatureFlags` interface and set default to `false` in `DEFAULT_FEATURE_FLAGS`
2. Add label in `developer-section.tsx` `FEATURE_FLAG_LABELS`
3. Add server-side guard: `featureFlags?.yourFlag ?? false`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI agents |
| `HOMEMAKER_VAULT_KEY` | For vault | 64-char hex key for AES-256-GCM secrets encryption |
| `AUTOMAKER_API_KEY` | Optional | API key for server authentication |
| `HOST` | No | Host to bind to (default: 0.0.0.0) |
| `PORT` | No | Server port (default: 3008) |
| `DATA_DIR` | No | Data storage directory (default: ./data) |
| `AUTOMAKER_MOCK_AGENT` | No | Enable mock agent mode for CI testing |
| `GITHUB_TOKEN` | Optional | For GitHub operations |

## Important Guidelines

- **Dev Server Management**: NEVER start, stop, restart, or otherwise manage the dev server yourself. Always ask the user to manage it.
- **No emojis in docs or code** except ✅ and ❌ as status indicators in tables.
- **Secrets handling**: Never log decrypted vault values. Only log IDs and metadata.

## Data Storage

### Per-Project Data (`.automaker/`)

```
.automaker/
├── features/              # Task/feature JSON files
│   └── {featureId}/
│       ├── feature.json
│       └── agent-output.md
├── context/               # Context files for AI agents
├── settings.json          # Project-specific settings
└── spec.md               # Project specification
```

### Global Data (`DATA_DIR`, default `./data`)

```
data/
├── settings.json          # Global settings
├── credentials.json       # API keys
├── sessions-metadata.json # Chat session metadata
└── agent-sessions/        # Conversation histories
```
