# Docker Production Setup - Handoff Document

This document captures the changes made to enable Docker deployment with Claude subscription and GitHub CLI authentication.

## Changes Made

### 1. Missing Dependencies Fixed

**`apps/ui/package.json`** - Added `zod` dependency (used by TanStack Router for search validation)

**`libs/spec-parser/package.json`** - Added `fast-xml-parser` dependency

### 2. Dockerfile Updates

**`Dockerfile`** - Two changes:

1. Added `libs/spec-parser/package*.json` to the COPY commands (was missing, caused build failure)
2. Changed `VITE_SERVER_URL` default from `http://localhost:3008` to `""` (empty string)
   - This allows the UI to use relative URLs in production
   - Nginx proxies `/api/*` requests to the backend server

### 3. Nginx Proxy Configuration

**`apps/ui/nginx.conf`** - Added proxy configuration for API requests:

```nginx
location /api {
    proxy_pass http://server:3008;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... additional headers for WebSocket support
}
```

This allows the UI container to forward API and WebSocket requests to the server container.

### 4. GitHub Token Support

**`docker-compose.yml`** - Added `GH_TOKEN` environment variable for GitHub CLI authentication:

```yaml
- GH_TOKEN=${GH_TOKEN:-}
```

---

## Production Deployment (Proxmox/Linux Server)

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned

### Step 1: Create `.env` file

```bash
# Claude subscription auth (extract on Mac with: ./scripts/get-claude-token.sh)
CLAUDE_OAUTH_CREDENTIALS='{"claudeAiOauth":{"accessToken":"...","refreshToken":"...","expiresAt":...}}'

# GitHub CLI token (get with: gh auth token)
GH_TOKEN=ghp_xxxxxxxxxxxx

# Optional: Fixed API key for web login (otherwise generates random one each restart)
AUTOMAKER_API_KEY=your-chosen-password

# Standard config
PORT=3008
DATA_DIR=./data
```

### Step 2: Build and Run

```bash
docker compose up --build -d
```

### Step 3: Access

- **UI:** http://your-server:3007
- **API:** http://your-server:3008

Login with the `AUTOMAKER_API_KEY` you set (or check `docker logs automaker-server` for the generated key).

---

## Extracting Authentication Tokens

### Claude OAuth (Mac Only)

Requires being logged into Claude Code CLI (`claude login`):

```bash
./scripts/get-claude-token.sh
```

Copy the full JSON output to `CLAUDE_OAUTH_CREDENTIALS` in your `.env`.

**Note:** OAuth tokens expire. Re-extract and update if Claude auth stops working.

### GitHub Token

```bash
gh auth token
```

Or create a Personal Access Token at https://github.com/settings/tokens with `repo` scope.

---

## Local Development (Alternative to Docker)

If you want to use your Mac's existing Claude CLI auth without extracting tokens:

```bash
npm install
npm run build:packages
npm run dev:web          # Terminal 1: UI on :3007
npm run dev --workspace=apps/server  # Terminal 2: Server on :3008
```

This uses your host machine's Claude CLI authentication directly.

---

## Troubleshooting

### "Server Unavailable" in Browser

1. Hard refresh (`Cmd+Shift+R`) to clear cached JavaScript
2. Check nginx proxy: `curl http://localhost:3007/api/health`
3. Check server directly: `curl http://localhost:3008/api/health`

### "CLI authentication failed"

- Docker can't access host machine's Claude CLI credentials
- Set `CLAUDE_OAUTH_CREDENTIALS` or `ANTHROPIC_API_KEY` in `.env`

### Build Failures

```bash
# Clean rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```
