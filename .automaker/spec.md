# homeMaker

A domestic tracking app for managing the home — projects, schedules, IoT sensors, money, and secrets — hosted on the home network (Tailscale) and managed via protoLabs Studio.

## Vision

Replace scattered spreadsheets, apps, and ad-hoc scripts with a single self-hosted interface for the household. Built on the protoMaker monorepo foundation, extended with home-specific modules.

## Already Built

| Module | Location | Status |
|--------|----------|--------|
| Sensor Registry | `apps/server/src/services/sensor-registry-service.ts` | Production-ready — register, report, online/stale/offline TTL |
| Context Aggregator | `apps/server/src/services/context-aggregator.ts` | Aggregates sensor readings into presence state |
| Calendar | `apps/ui/src/components/views/calendar-view/` | Full CRUD events, create dialog, event detail panel |
| Kanban Board | `apps/ui/src/components/views/board-view/` | Repurposed for house project tracking |
| Todo | `apps/ui/src/components/views/todo-view/` | Task list cards |
| Notes | `apps/ui/src/components/views/notes-view/` | Tabbed notes |

## What Needs to Be Built

1. **Sensor Dashboard** — Dedicated UI view for all registered IoT sensors (move from Settings, add real-time status, history charts)
2. **Budget Tracking** — Household income, expenses, bills, budget categories
3. **Secrets Vault** — Encrypted local secrets (passwords, API keys, WiFi creds, home codes) — AES-256-GCM at rest
4. **Pipeline Removal** — Strip AI agent/LangGraph/Lead Engineer/worktree infrastructure (not needed for home app)

## Architecture

Monorepo: Turbo + npm workspaces

- `apps/server/` — Express 5 + SQLite + WebSocket
- `apps/ui/` — React 19 + Vite + TanStack Router + Zustand

## Hosting

Self-hosted via Tailscale. No public internet exposure. Auth handled at the network layer (Tailscale) with API key as a fallback second factor.

## Key Constraints

- Single-household use — multi-user is optional if Tailscale handles access control
- All data stays local (SQLite, no cloud sync for sensitive data)
- Sensors use the existing register/report REST API pattern
- No AI agent pipeline — strip Claude SDK, LangGraph, worktrees, Lead Engineer from server
