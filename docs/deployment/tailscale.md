# Deploy homeMaker via Tailscale

Deploy homeMaker on a home server using Docker Compose with a Tailscale sidecar. No ports are exposed to the public internet — all access is private, network-level authenticated through Tailscale.

## Prerequisites

- Docker and Docker Compose installed on the home server
- A [Tailscale](https://tailscale.com) account

## Why Tailscale

Tailscale creates an encrypted private network (WireGuard-based) between your devices. Using it as the access layer for homeMaker means:

- No login screen or password needed — network membership is the auth
- No firewall rules or port forwarding to configure on your router
- All traffic between your devices stays encrypted end-to-end
- The server is completely invisible to the public internet

## Step 1 — Generate a vault key

The vault uses AES-256-GCM encryption. Generate a 64-character hex key:

```bash
openssl rand -hex 32
```

Save the output — you will need it in the next step.

## Step 2 — Create the env file

```bash
cp .env.homemaker.example .env.homemaker
```

Open `.env.homemaker` and fill in:

| Variable              | How to get it                                                            |
| --------------------- | ------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`   | [console.anthropic.com](https://console.anthropic.com)                   |
| `HOMEMAKER_VAULT_KEY` | Output from `openssl rand -hex 32` (Step 1)                              |
| `AUTOMAKER_API_KEY`   | Any strong random string — `openssl rand -hex 32` works                  |
| `TS_AUTHKEY`          | Tailscale admin console → Settings → Keys → Generate auth key            |
| `TAILSCALE_HOSTNAME`  | The name this server will have on your TS network (default: `homemaker`) |

When generating the Tailscale auth key, check **Reusable** and add the tag `tag:homemaker` so the key matches the advertised tag in the compose file.

## Step 3 — Start the stack

```bash
docker compose -f docker-compose.homemaker.yml --env-file .env.homemaker up -d
```

This starts three containers:

- `server` — Express backend on port 3008 (internal network only)
- `ui` — Nginx serving the built frontend on port 80/3007 (internal network only)
- `tailscale` — Tailscale sidecar that registers this host on your private network

## Step 4 — Verify Tailscale is connected

```bash
docker compose -f docker-compose.homemaker.yml logs tailscale
```

You should see a line like `Login successful` or `Already logged in`. The server will appear in your Tailscale admin console under the hostname you set.

## Step 5 — Access homeMaker

From any device on your Tailscale network:

```
http://homemaker:3007
```

Replace `homemaker` with whatever you set as `TAILSCALE_HOSTNAME`. If you have [MagicDNS](https://tailscale.com/kb/1081/magicdns) enabled in your Tailscale admin console, the hostname resolves automatically on all your devices.

## Stopping and updating

```bash
# Stop
docker compose -f docker-compose.homemaker.yml --env-file .env.homemaker down

# Pull updated images and restart
docker compose -f docker-compose.homemaker.yml --env-file .env.homemaker pull
docker compose -f docker-compose.homemaker.yml --env-file .env.homemaker up -d
```

## Next steps

- [Configure IoT sensors](../modules/sensors.md) to report readings to the server
- [Set up the vault](../modules/vault.md) for encrypted credential storage
- [Add maintenance schedules](../modules/maintenance.md) for home obligations
- [Backup your data](./backup.md) — all persistent data lives in the `homemaker-data` Docker volume
