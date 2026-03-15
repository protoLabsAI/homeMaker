# Deploy homeMaker on Tailscale

Set up homeMaker as a private home server accessible across your Tailscale network.

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- A [Tailscale](https://tailscale.com) account with at least one machine enrolled
- An Anthropic API key

## Environment setup

Create a `.env` file in the project root:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Vault encryption — generate with: openssl rand -hex 32
HOMEMAKER_VAULT_KEY=your-64-char-hex-key

# Ports
PORT=3008
HOST=0.0.0.0

# Data directory (persisted across container restarts)
DATA_DIR=/data

# Optional — weather widget
OPENWEATHERMAP_API_KEY=your-key
OPENWEATHERMAP_LAT=37.7749
OPENWEATHERMAP_LON=-122.4194

# Optional — sensor history
SENSOR_HISTORY_RETENTION_DAYS=30
```

Generate the vault key with:

```bash
openssl rand -hex 32
```

## Start with Docker Compose

```bash
docker compose up -d
```

The UI is available at `http://localhost:3007` and the API at `http://localhost:3008`.

## Access via Tailscale

1. Install Tailscale on the host machine and sign in:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

2. Find the machine's Tailscale hostname (e.g., `my-home-server`):

```bash
tailscale status
```

3. Access homeMaker from any Tailscale device:

```
http://my-home-server:3007
```

For a cleaner URL, set a [Tailscale MagicDNS](https://tailscale.com/kb/1081/magicdns) name and use:

```
http://homemaker:3007
```

## Backup strategy

All persistent data lives in the `DATA_DIR` volume and the `homemaker.db` SQLite file. Back up both:

```bash
# Stop the server to prevent write-ahead log splits
docker compose stop server

# Copy the data directory
rsync -av ./data/ /backup/homemaker-data/

# Copy the database
cp homemaker.db /backup/homemaker.db

# Restart
docker compose start server
```

Schedule with cron for automated nightly backups:

```bash
# crontab -e
0 2 * * * /home/user/homemaker/scripts/backup.sh
```

## Next steps

- [Configure IoT sensors](../modules/sensors.md) to report readings to the server
- [Set up the vault](../modules/vault.md) for encrypted credential storage
- [Add maintenance schedules](../modules/maintenance.md) for home obligations
