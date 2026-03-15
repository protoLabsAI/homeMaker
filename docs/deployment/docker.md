# Deploy with Docker Compose

This guide sets up homeMaker for production using Docker Compose. By the end you will have a containerized instance with persistent storage, automatic restarts, and a health check.

## Prerequisites

- Docker 24+
- Docker Compose v2
- A server with at least 512 MB RAM and 2 GB disk

## Docker Compose configuration

Create a `docker-compose.yml` in your deployment directory:

```yaml
services:
  homemaker:
    image: ghcr.io/your-org/homemaker:latest
    restart: unless-stopped
    ports:
      - "8578:8578"
      - "8579:8579"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - HOMEMAKER_VAULT_KEY=${HOMEMAKER_VAULT_KEY}
      - PORT=8579
      - HOST=0.0.0.0
      - DATA_DIR=/data
    volumes:
      - homemaker-data:/data
      - homemaker-db:/app/homemaker.db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8579/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  homemaker-data:
  homemaker-db:
```

## Environment file

Create a `.env` file alongside `docker-compose.yml`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
HOMEMAKER_VAULT_KEY=your-64-char-hex-key
```

Generate the vault key:

```bash
openssl rand -hex 32
```

## Start the server

```bash
docker compose up -d
```

Check the logs:

```bash
docker compose logs -f homemaker
```

The UI is at `http://your-server:8578` and the API at `http://your-server:8579`.

## Verify the deployment

```bash
curl http://localhost:8579/api/health
# Expected: {"status":"ok"}
```

## Update to a new version

```bash
docker compose pull
docker compose up -d
```

Data in the named volumes persists across updates.

## Stop the server

```bash
docker compose down
```

Data volumes are preserved. To remove volumes too (destructive):

```bash
docker compose down -v
```

## Next steps

- [Back up the database](./backup.md)
- [Connect via Tailscale](./tailscale.md) for remote access
