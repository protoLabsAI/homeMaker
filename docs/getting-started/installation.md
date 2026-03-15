# Install homeMaker

This guide covers installing homeMaker on Linux, macOS, and Windows, configuring all environment variables, and verifying the installation works.

## Prerequisites

- Node.js 22+
- npm 10+
- Git
- An Anthropic API key

## Install Node.js

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install nodejs
```

### macOS

```bash
brew install node@22
```

### Windows

Download the Node.js 22 installer from [nodejs.org](https://nodejs.org) and run it.

## Clone and install

```bash
git clone https://github.com/your-org/homeMaker.git
cd homeMaker
npm install
npm run build:packages
```

## Environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI agents |
| `HOMEMAKER_VAULT_KEY` | For vault | 64-char hex key for AES-256-GCM secrets encryption |
| `AUTOMAKER_API_KEY` | Optional | API key for server authentication |
| `HOST` | No | Host to bind to (default: `0.0.0.0`) |
| `PORT` | No | Server port (default: `8579`) |
| `DATA_DIR` | No | Data storage directory (default: `./data`) |
| `AUTOMAKER_MOCK_AGENT` | No | Set to `true` to enable mock agent mode for CI testing |
| `GITHUB_TOKEN` | Optional | For GitHub operations |
| `OPENWEATHERMAP_API_KEY` | Optional | Weather widget API key |
| `OPENWEATHERMAP_LAT` | No | Home latitude for weather |
| `OPENWEATHERMAP_LON` | No | Home longitude for weather |
| `SENSOR_HISTORY_RETENTION_DAYS` | No | Days of sensor history (default: `30`) |

Generate the vault key:

```bash
openssl rand -hex 32
```

## Start the server

### Development (UI + server together)

```bash
npm run dev:full
```

UI is at `http://localhost:8578`, API at `http://localhost:8579`.

### UI only

```bash
npm run dev:web
```

### Backend only

```bash
npm run dev:server
```

## Verify the installation

1. Open `http://localhost:8578` — the dashboard should load.
2. Open `http://localhost:8579/api/health` — should return `{ "status": "ok" }`.
3. Navigate to the Board tab and create a task — it should persist after a page reload.

## Common issues

**Port already in use**

Change `PORT` in `.env` or kill the process using the port:

```bash
lsof -ti:8579 | xargs kill
```

**Build fails with missing packages**

Run `npm run build:packages` before starting. Shared libraries must be built first.

**Vault operations fail**

Verify `HOMEMAKER_VAULT_KEY` is exactly 64 hex characters. Generate a new one with `openssl rand -hex 32`.

## Next steps

- [Add your first asset](./first-asset.md)
- [Deploy with Docker](../deployment/docker.md)
- [Connect to Tailscale](../deployment/tailscale.md)
