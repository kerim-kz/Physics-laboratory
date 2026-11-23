#!/usr/bin/env bash
# Render-дегі дерекқорды (пайдаланушылар, нәтижелер, материалдар, файлдар) осы серверге көшіру.
# Іске қосу:  bash /opt/gylym/deploy/restore-from-render.sh
# Render → дерекқор → Connect → «External Database URL» мекенжайын сұрағанда қойыңыз (экранда көрінбейді).
# НАЗАР АУДАРЫҢЫЗ: осы сервердегі қазіргі дерекқор толығымен ауыстырылады (алдымен резервтік көшірме алынады).
set -euo pipefail
cd /opt/gylym/deploy
read -r -s -p "Render External Database URL: " SRC; echo
SRC=$(printf '%s' "$SRC" | tr -d '[:space:]')
[ -n "$SRC" ] || { echo "Мекенжай бос."; exit 1; }
case "$SRC" in
  postgres://*|postgresql://*) ;;
  *) echo "Мекенжай postgresql:// деп басталуы керек. Render-ден қайта көшіріп, скриптті қайта іске қосыңыз."; exit 1 ;;
esac
if [ "$(printf '%s' "$SRC" | grep -o '://' | wc -l)" -ne 1 ]; then
  echo "Мекенжай екі рет қойылып кеткен сияқты. Скриптті қайта іске қосып, тышқанның оң жақ батырмасын тек БІР рет басыңыз."
  exit 1
fi
case "$SRC" in *sslmode=*) ;; *\?*) SRC="$SRC&sslmode=require" ;; *) SRC="$SRC?sslmode=require" ;; esac
read -r -p "Сервердегі дерекқор Render-дегімен ауыстырылады. Жалғастырамыз ба? (иә/жоқ): " OK
[ "$OK" = "иә" ] || [ "$OK" = "ia" ] || [ "$OK" = "yes" ] || { echo "Тоқтатылды."; exit 0; }

echo "== 1. Қазіргі дерекқордың резервтік көшірмесі"
bash ./backup.sh || true
echo "== 2. Render-ден деректерді жүктеу (бірнеше минут)"
TMP=$(mktemp /tmp/render-dump-XXXX.sql)
trap 'rm -f "$TMP"' EXIT
# Қате хабарламасында мекенжай (ішінде құпиясөз бар) экранға шықпасын.
hide() { sed -E 's#postgres(ql)?://[^" ]*#[мекенжай жасырылды]#g'; }
if ! docker run --rm -e SRC="$SRC" postgres:18-alpine sh -c 'pg_dump "$SRC" --no-owner --no-privileges' 2> >(hide >&2) \
     | sed '/^SET transaction_timeout/d' > "$TMP" || [ ! -s "$TMP" ]; then
  echo "Жүктеу сәтсіз аяқталды. Мекенжайды Render-ден қайта көшіріп, скриптті қайта іске қосыңыз."
  exit 1
fi
echo "   жүктелді: $(du -h "$TMP" | cut -f1)"
echo "== 3. Сайтты уақытша тоқтатып, дерекқорды ауыстыру"
docker compose stop app
docker compose exec -T db psql -U fizika -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS fizika WITH (FORCE);" -c "CREATE DATABASE fizika OWNER fizika;"
docker compose exec -T db psql -U fizika -d fizika -v ON_ERROR_STOP=1 -q < "$TMP"
echo "== 4. Сайтты қайта іске қосу"
docker compose start app
sleep 5
docker compose ps
echo "Дайын. Render-дегі логин-құпиясөздермен кіріп тексеріңіз."
