#!/usr/bin/env bash
# Сайтты GitHub-тағы соңғы нұсқаға жаңарту:  bash /opt/gylym/deploy/update.sh
set -euo pipefail
cd /opt/gylym
echo "== Жаңарту алдында резервтік көшірме"
bash deploy/backup.sh
echo "== Соңғы кодты алу"
git pull --ff-only
echo "== Қайта құрастыру және іске қосу"
cd deploy
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
echo "Дайын. Сайт жаңартылды."
