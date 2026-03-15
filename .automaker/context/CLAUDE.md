# homeMaker — Agent Context

## What This Is

A domestic home management hub built on the protoMaker platform. The AI agent pipeline, board, and auto-mode are CORE FEATURES — they help manage home projects, research purchases, plan renovations, and track maintenance schedules.

## What Agents Do Here

Unlike protoMaker (where agents write code), homeMaker agents primarily:
- **Research**: Compare products, find contractors, look up how-to guides, estimate costs
- **Plan**: Break down renovations into phases with dependencies, create timelines
- **Track**: Manage recurring maintenance (HVAC filters, gutter cleaning, lawn care)
- **Organize**: Summarize findings into actionable recommendations
- **Code** (when needed): Build new UI views, add backend services, fix bugs — same as protoMaker

Default to research-and-report mode. Only write code when the task explicitly requires implementation.

## What Exists (reuse these)

- **Board/Kanban** — tracks house projects as tasks with status, priority, dependencies
- **Auto-mode** — agents pick up tasks from the board and execute them autonomously
- **Sensor Registry** (`apps/server/src/services/sensor-registry-service.ts`) — IoT device data collection
- **Context Aggregator** (`apps/server/src/services/context-aggregator.ts`) — presence detection from sensors
- **Calendar view** (`apps/ui/src/components/views/calendar-view/`) — home schedule events
- **Todo** (`apps/ui/src/components/views/todo-view/`) — task lists
- **Notes** (`apps/ui/src/components/views/notes-view/`) — household notes
- **Chat (Ava)** — conversational AI assistant for the household
- **Event system** (`apps/server/src/lib/events.ts`) — real-time WebSocket push

## Tech Stack

- **Frontend**: React 19, Vite 7, TanStack Router, Zustand 5, Tailwind CSS 4, Radix UI
- **Backend**: Express 5, SQLite, WebSocket, Claude Agent SDK
- **Shared libs**: `@protolabsai/types`, `@protolabsai/utils`, `@protolabsai/ui`, `@protolabsai/prompts`

## Adding New Backend Modules

Follow the sensor registry pattern:
1. Define types in `libs/types/src/`
2. Create service in `apps/server/src/services/`
3. Create routes in `apps/server/src/routes/<module>/`
4. Wire into `apps/server/src/server/routes.ts`
5. Add to `ServiceContainer` in `apps/server/src/server/services.ts`

## Adding New UI Views

1. Create view in `apps/ui/src/components/views/<module>-view/`
2. Add route file `apps/ui/src/routes/<module>.tsx`
3. Add nav item in `apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts`

## Security Rules

- Secrets are encrypted AES-256-GCM at rest (never store plaintext)
- Use the existing `apps/server/src/lib/auth.ts` for API key validation
- Rate limit all write endpoints
- Never log secret values, only IDs and metadata
- Tailscale handles network-level auth — no login UI needed
