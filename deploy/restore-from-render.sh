#!/usr/bin/env bash
# Render-дегі дерекқорды (пайдаланушылар, нәтижелер, материалдар, файлдар) осы серверге көшіру.
# Іске қосу:  bash /opt/gylym/deploy/restore-from-render.sh
# Render → дерекқор → Connect → «External Database URL» мекенжайын сұрағанда қойыңыз (экранда көрінбейді).
# НАЗАР АУДАРЫҢЫЗ: осы сервердегі қазіргі дерекқор толығымен ауыстырылады (алдымен резервтік көшірме алынады).
set -euo pipefail
cd /opt/gylym/deploy
read -r -s -p "Render External Database URL: " SRC; echo
[ -n "$SRC" ] || { echo "Мекенжай бос."; exit 1; }
case "$SRC" in *sslmode=*) ;; *\?*) SRC="$SRC&sslmode=require" ;; *) SRC="$SRC?sslmode=require" ;; esac
read -r -p "Сервердегі дерекқор Render-дегімен ауыстырылады. Жалғастырамыз ба? (иә/жоқ): " OK
[ "$OK" = "иә" ] || [ "$OK" = "ia" ] || [ "$OK" = "yes" ] || { echo "Тоқтатылды."; exit 0; }

echo "== 1. Қазіргі дерекқордың резервтік көшірмесі"
bash ./backup.sh || true
echo "== 2. Render-ден деректерді жүктеу (бірнеше минут)"
TMP=$(mktemp /tmp/render-dump-XXXX.sql)
docker run --rm -e SRC="$SRC" postgres:17-alpine sh -c 'pg_dump "$SRC" --no-owner --no-privileges' | sed '/^SET transaction_timeout/d' > "$TMP"
[ -s "$TMP" ] || { echo "Жүктеу сәтсіз аяқталды."; rm -f "$TMP"; exit 1; }
echo "   жүктелді: $(du -h "$TMP" | cut -f1)"
echo "== 3. Сайтты уақытша тоқтатып, дерекқорды ауыстыру"
docker compose stop app
docker compose exec -T db psql -U fizika -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS fizika WITH (FORCE);" -c "CREATE DATABASE fizika OWNER fizika;"
docker compose exec -T db psql -U fizika -d fizika -v ON_ERROR_STOP=1 -q < "$TMP"
rm -f "$TMP"
echo "== 4. Сайтты қайта іске қосу"
docker compose start app
sleep 5
docker compose ps
echo "Дайын. Render-дегі логин-құпиясөздермен кіріп тексеріңіз."
