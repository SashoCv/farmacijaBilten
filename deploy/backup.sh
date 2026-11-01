#!/usr/bin/env bash
# Nightly backup: a consistent copy of the SQLite database (safe while the
# site is running, WAL included), the uploaded manuscripts and the .env file,
# kept 14 days locally and copied off the server with rsync.
#
#   BACKUP_TARGET=user@host:path deploy/backup.sh
#
# Requires the sqlite3 command-line tool. The mirrored journal files
# (storage/app/journal, ~800 MB) change only when an issue is published:
# back them up after each issue (see DEPLOY.md) rather than nightly.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bulletin}"
STAMP="$(date +%Y-%m-%d)"
DEST="$BACKUP_DIR/$STAMP"

mkdir -p "$DEST"

# .backup takes a consistent snapshot even while PHP is writing.
sqlite3 "$APP_DIR/database/database.sqlite" ".backup '$DEST/database.sqlite'"
sqlite3 "$DEST/database.sqlite" "PRAGMA integrity_check;" | grep -qx ok

# Manuscripts and author forms sent through the submission form.
tar -czf "$DEST/private.tar.gz" -C "$APP_DIR/storage/app" private
cp "$APP_DIR/.env" "$DEST/env"
chmod -R go-rwx "$DEST"

# Keep two weeks locally.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

if [[ -n "${BACKUP_TARGET:-}" ]]; then
    rsync -a --delete "$BACKUP_DIR/" "$BACKUP_TARGET/"
fi

echo "$(date -Is) backup ok: $DEST"
