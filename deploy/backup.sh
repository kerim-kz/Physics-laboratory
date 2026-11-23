#!/usr/bin/env bash
# Дерекқордың резервтік көшірмесі: /opt/gylym-backups/gylym-КҮН-УАҚЫТ.sql.gz (соңғы 14 күн сақталады).
# Қолмен іске қосу:  bash /opt/gylym/deploy/backup.sh
set -euo pipefail
BACKUP_DIR=${BACKUP_DIR:-/opt/gylym-backups}
mkdir -p "$BACKUP_DIR"
cd "$(dirname "$0")"
FILE="$BACKUP_DIR/gylym-$(date +%Y-%m-%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U fizika -d fizika --no-owner --no-privileges | gzip > "$FILE"
find "$BACKUP_DIR" -name 'gylym-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') резервтік көшірме: $FILE ($(du -h "$FILE" | cut -f1))"
