<p align="center">
  <strong>homeMaker</strong>
</p>

<p align="center">
  <strong>Your home, managed by AI.</strong><br/>
  Track house projects, budgets, schedules, IoT sensors, and secrets — with AI agents that research, plan, and organize for you.
</p>

<p align="center">
  <a href="https://github.com/protoLabsAI/homeMaker/actions/workflows/checks.yml"><img src="https://github.com/protoLabsAI/homeMaker/actions/workflows/checks.yml/badge.svg" alt="Build Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen" alt="Node Version" /></a>
</p>

> **Alpha Software** --- homeMaker is under active development. Built on the protoLabs Studio platform, adapted for domestic use.

---

## The Idea

Your household generates a constant stream of projects, purchases, maintenance schedules, and decisions. homeMaker gives you a single self-hosted interface to manage all of it — with AI agents that do the legwork.

Add a task to the board: "Research best smart thermostat for 2000 sq ft house." An AI agent picks it up, searches for options, compares features and prices, and delivers a summary with recommendations. You review and decide.

The same system handles renovation planning (break a kitchen remodel into phased tasks with dependencies), recurring maintenance tracking (HVAC filters, gutter cleaning, lawn care), budget management, IoT sensor monitoring, and encrypted secrets storage.

## Features

### AI-Powered Task Management

A Kanban board where AI agents pick up tasks and execute them autonomously. Unlike coding tools, homeMaker agents default to **research-and-report** mode — they gather information, summarize findings, and make recommendations.

### IoT Sensor Dashboard

Register smart home devices via REST API. Sensors report readings, the system tracks online/stale/offline status with TTL-based detection, and a context aggregator determines household presence (active, idle, away, headless).

### Budget Tracking

Track household income, expenses, and bills by category. Monthly summaries, category breakdowns, and budget targets — all stored locally in SQLite.

### Secrets Vault

Encrypted local storage for passwords, API keys, WiFi credentials, and home codes. AES-256-GCM encryption at rest. Values never exposed unless explicitly revealed.

### Calendar and Scheduling

Full event management with creation, editing, and detail views. Schedule home maintenance, family events, and project deadlines.

### Notes and Todo Lists

Household notes with tabs, and task lists for quick items that don't need the full board treatment.

## Get Started

```bash
git clone https://github.com/protoLabsAI/homeMaker.git
cd homeMaker
npm install
npm run dev:full            # Web mode — starts UI (localhost:3007) AND server (localhost:3008)
```

Requires **Node.js 22+** and an [Anthropic API key](https://console.anthropic.com/).

### Tailscale Deployment (Recommended)

homeMaker is designed to run on your home network behind Tailscale. No public internet exposure, no login screens — Tailscale handles access control at the network layer.

```bash
# Set required environment variables
export HOMEMAKER_VAULT_KEY=$(openssl rand -hex 32)  # For secrets vault encryption
export ANTHROPIC_API_KEY=your-key-here

# Run with Docker
docker compose -f docker-compose.homemaker.yml up -d
```

Access from any Tailscale device at `http://homemaker:3007`.

## How It Works

```
You describe a task --> AI agent picks it up --> Researches/plans/organizes --> Reports back --> You review
```

1. Add a task to the board with a natural language description
2. Auto-mode assigns an AI agent based on task complexity
3. Agent researches, compares, plans, or organizes — whatever the task requires
4. Results delivered as a summary you can review and act on
5. For code tasks (building new features for homeMaker itself), agents work the same way as protoLabs Studio

## Architecture

TypeScript monorepo with a React frontend, Express backend, and shared packages:

```
homeMaker/
├── apps/
│   ├── ui/              # React + Vite frontend (port 3007)
│   └── server/          # Express + WebSocket backend (port 3008)
└── libs/                # Shared packages
    ├── types/           # Core TypeScript definitions
    ├── utils/           # Logging, errors, context loading
    ├── ui/              # Shared UI components (atoms, molecules, theme)
    ├── prompts/         # AI prompt templates
    ├── platform/        # Path management, security
    ├── git-utils/       # Git operations
    ├── flows/           # LangGraph state graph primitives
    ├── tools/           # Tool definition and registry
    └── ...              # model-resolver, dependency-resolver, observability
```

**Key Stack**: React 19, Vite 7, Express 5, Claude Agent SDK, TanStack Router, Zustand 5, Tailwind CSS 4, SQLite, Vitest, Playwright

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI agents |
| `HOMEMAKER_VAULT_KEY` | For vault | 64-char hex key for secrets encryption |
| `AUTOMAKER_API_KEY` | Optional | API key for server authentication |
| `PORT` | No | Server port (default: 3008) |
| `HOST` | No | Host to bind to (default: 0.0.0.0) |
| `DATA_DIR` | No | Data storage directory (default: ./data) |

## Security

homeMaker is designed for **self-hosted, Tailscale-only deployment**. It is NOT designed to be exposed to the public internet.

- Secrets are encrypted with AES-256-GCM at rest
- Tailscale provides network-level access control
- API key authentication as a second factor
- Rate limiting on sensitive endpoints

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT --- see [LICENSE](LICENSE).

Built on [protoLabs Studio](https://github.com/protoLabsAI/protoMaker) (MIT).
