# Back up and restore homeMaker

This guide covers backing up the homeMaker database and data directory, restoring from a backup, and automating nightly backups with cron.

## What to back up

homeMaker stores all state in two locations:

| Location | Contents |
| --- | --- |
| `homemaker.db` | SQLite database — all modules, events, schedules |
| `DATA_DIR` (default `./data`) | Settings, credentials, session histories |

Both must be backed up together. A database backup without the data directory (or vice versa) may leave credentials or settings inconsistent.

## Manual backup

Stop the server before copying to avoid WAL splits:

```bash
# Stop the server
docker compose stop homemaker
# or: npm run dev:server (Ctrl+C)

# Copy the database
cp homemaker.db /backup/homemaker-$(date +%Y%m%d).db

# Copy the data directory
rsync -av ./data/ /backup/homemaker-data-$(date +%Y%m%d)/

# Restart the server
docker compose start homemaker
```

## Online backup with SQLite .backup

If you cannot stop the server, use SQLite's online backup API:

```bash
sqlite3 homemaker.db ".backup '/backup/homemaker-live.db'"
```

This is safe to run while the server is writing. The resulting file is a consistent snapshot.

## Restore from backup

```bash
# Stop the server
docker compose stop homemaker

# Restore the database
cp /backup/homemaker-20260315.db homemaker.db

# Restore the data directory
rsync -av /backup/homemaker-data-20260315/ ./data/

# Restart
docker compose start homemaker
```

## Automated nightly backup

Create a backup script at `/usr/local/bin/homemaker-backup.sh`:

```bash
#!/bin/bash
set -e

HOMEMAKER_DIR=/home/user/homemaker
BACKUP_DIR=/backup/homemaker
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Online database backup (safe while server runs)
sqlite3 "$HOMEMAKER_DIR/homemaker.db" ".backup '$BACKUP_DIR/homemaker-$DATE.db'"

# Copy data directory
rsync -a "$HOMEMAKER_DIR/data/" "$BACKUP_DIR/data-$DATE/"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "homemaker-*.db" -mtime +30 -delete
find "$BACKUP_DIR" -maxdepth 1 -name "data-*" -type d -mtime +30 -exec rm -rf {} +

echo "Backup complete: $BACKUP_DIR/homemaker-$DATE.db"
```

Make it executable:

```bash
chmod +x /usr/local/bin/homemaker-backup.sh
```

Schedule it with cron (runs at 2 AM daily):

```bash
crontab -e
# Add:
0 2 * * * /usr/local/bin/homemaker-backup.sh >> /var/log/homemaker-backup.log 2>&1
```

## Verify a backup

```bash
sqlite3 /backup/homemaker-20260315.db "SELECT count(*) FROM inventory_items;"
```

A healthy database returns a row count. An error or empty output indicates a corrupt backup.

## Next steps

- [Docker Compose deployment](./docker.md)
- [Tailscale remote access](./tailscale.md)
