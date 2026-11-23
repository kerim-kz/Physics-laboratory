#!/usr/bin/env bash
# Дерекқордың резервтік көшірмесі: /opt/gylym-backups/gylym-КҮН-УАҚЫТ.sql.gz (соңғы 14 күн сақталады).
# Қолмен іске қосу:  bash /home/user/physics-laboratory/deploy/backup.sh
set -euo pipefail
BACKUP_DIR=/tmp/claude-0/gyl-bk
mkdir -p "$BACKUP_DIR"
cd /home/user/physics-laboratory/deploy
FILE="$BACKUP_DIR/gylym-$(date +%Y-%m-%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U fizika -d fizika --no-owner --no-privileges | gzip > "$FILE"
find "$BACKUP_DIR" -name 'gylym-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') резервтік көшірме: $FILE ($(du -h "$FILE" | cut -f1))"
