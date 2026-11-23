#!/usr/bin/env bash
# ЖИ кілтін серверге қосу (немесе ауыстыру/өшіру):  bash /opt/gylym/deploy/set-ai.sh
# Кілт экранда көрінбейді. Скрипт кілтті провайдерде тексереді, Google үшін моделді өзі таңдайды,
# .env файлына жазады және сайтты қайта іске қосады.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE=.env
[ -f "$ENV_FILE" ] || { echo ".env табылмады. Алдымен install.sh орындаңыз."; exit 1; }
GOOGLE_BASE=${GOOGLE_BASE:-https://generativelanguage.googleapis.com/v1beta/openai}
ANTHROPIC_BASE=${ANTHROPIC_BASE:-https://api.anthropic.com}
TMP=$(mktemp)
trap 'rm -f "$TMP" "$ENV_FILE.tmp"' EXIT

# .env ішінде айнымалыны ауыстыру немесе қосу (файлдың рұқсаттары сақталады).
setvar() {
  awk -v n="$1" -v v="$2" 'BEGIN { done = 0 }
    index($0, n "=") == 1 { print n "=" v; done = 1; next }
    { print }
    END { if (!done) print n "=" v }' "$ENV_FILE" > "$ENV_FILE.tmp"
  cat "$ENV_FILE.tmp" > "$ENV_FILE"
}
readkey() {
  read -r -s -p "$1" KEY; echo
  KEY=$(printf '%s' "$KEY" | tr -d '[:space:]')
  if ! printf '%s' "$KEY" | grep -Eq '^[A-Za-z0-9_-]{20,200}$'; then
    echo "Кілт дұрыс емес сияқты (бос немесе артық таңбалар бар). Кілтті қайта көшіріп, скриптті қайта іске қосыңыз."
    exit 1
  fi
}
restart() {
  echo "Сайт жаңа баптаулармен қайта іске қосылуда..."
  docker compose up -d app >/dev/null
  echo "Дайын. Сайтта: Әкімші → ЖИ бетінде күйін тексеріңіз."
}

echo "ЖИ провайдерін таңдаңыз:"
echo "  1 — Google AI Studio (тегін, ұсынылады)"
echo "  2 — Anthropic Claude (ақылы, ең сапалы)"
echo "  3 — ЖИ-ді өшіру (кілттерді серверден алып тастау)"
read -r -p "Нөмірін жазыңыз (1/2/3): " CHOICE

case "$CHOICE" in
1)
  readkey "Google AI Studio кілті (AIza…, экранда көрінбейді): "
  echo "Кілт тексерілуде..."
  CODE=$(curl -s -m 30 -o "$TMP" -w '%{http_code}' -H "Authorization: Bearer $KEY" "$GOOGLE_BASE/models" || echo 000)
  if [ "$CODE" != 200 ]; then
    if grep -qi 'location is not supported' "$TMP"; then
      echo "Google бұл сервердің елінен тегін API-ге рұқсат бермейді. 2-жолды (Anthropic) таңдаңыз."
    elif [ "$CODE" = 000 ]; then
      echo "Google-ға қосылу мүмкін болмады. Интернетті тексеріп, кейінірек қайталаңыз."
    else
      echo "Google кілтті қабылдамады (код $CODE). Кілтті aistudio.google.com-нан қайта көшіріңіз."
    fi
    exit 1
  fi
  # Мәтінге арналған Flash модельдері: ең жаңасы негізгі, «lite» нұсқасы қосалқы.
  MODELS=$(grep -o '"id": *"[^"]*"' "$TMP" | sed -E 's/.*"([^"]*)"$/\1/; s#^models/##' \
    | grep -i 'flash' | grep -Eiv 'image|tts|audio|live|embed|vision|thinking|exp|preview' | sort -Vr || true)
  MAIN=$(printf '%s\n' "$MODELS" | grep -iv 'lite' | head -1 || true)
  SPARE=$(printf '%s\n' "$MODELS" | grep -i 'lite' | head -1 || true)
  if [ -z "$MAIN" ]; then MAIN=$SPARE; SPARE=; fi
  if [ -z "$MAIN" ]; then
    echo "Қолжетімді тегін модельдер:"
    grep -o '"id": *"[^"]*"' "$TMP" | sed -E 's/.*"([^"]*)"$/\1/; s#^models/##' | grep -i gemini | head -20 | sed 's/^/  /'
    read -r -p "Модель атауын жазыңыз: " MAIN
    MAIN=$(printf '%s' "$MAIN" | tr -d '[:space:]')
    printf '%s' "$MAIN" | grep -Eq '^[A-Za-z0-9._-]+$' || { echo "Модель атауы дұрыс емес."; exit 1; }
  fi
  echo "Модель: $MAIN${SPARE:+ (қосалқы: $SPARE)}. Сынақ сұраныс жіберілуде..."
  CODE=$(curl -s -m 60 -o "$TMP" -w '%{http_code}' -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MAIN\",\"messages\":[{\"role\":\"user\",\"content\":\"Тек бір сөзбен жауап бер: сәлем\"}],\"max_tokens\":20}" \
    "$GOOGLE_BASE/chat/completions" || echo 000)
  if [ "$CODE" = 429 ]; then
    echo "Ескерту: бұл модельдің тегін лимиті қазір таусылған (429). Кілт сақталады; лимит ертең жаңарады."
  elif [ "$CODE" != 200 ]; then
    echo "Сынақ сұраныс сәтсіз аяқталды (код $CODE). Кілт сақталмады."
    exit 1
  fi
  setvar AI_BASE_URL "$GOOGLE_BASE"
  setvar AI_API_KEY "$KEY"
  setvar AI_MODEL "$MAIN${SPARE:+,$SPARE}"
  echo "Google AI Studio кілті сақталды."
  restart
  ;;
2)
  readkey "Anthropic кілті (sk-ant-…, экранда көрінбейді): "
  case "$KEY" in sk-ant-*) ;; *) echo "Anthropic кілті sk-ant- деп басталуы керек."; exit 1 ;; esac
  echo "Кілт тексерілуде..."
  CODE=$(curl -s -m 30 -o "$TMP" -w '%{http_code}' -H "x-api-key: $KEY" -H 'anthropic-version: 2023-06-01' "$ANTHROPIC_BASE/v1/models" || echo 000)
  if [ "$CODE" != 200 ]; then
    echo "Anthropic кілтті қабылдамады (код $CODE). Кілтті console.anthropic.com-нан қайта көшіріңіз."
    exit 1
  fi
  setvar ANTHROPIC_API_KEY "$KEY"
  # Тегін провайдер бірінші орында тұратындықтан, оның баптауларын тазалаймыз.
  setvar AI_BASE_URL ""
  setvar AI_API_KEY ""
  setvar AI_MODEL ""
  echo "Anthropic кілті сақталды. Модельді сайттағы Әкімші → ЖИ бетінде таңдайсыз."
  restart
  ;;
3)
  for v in AI_BASE_URL AI_API_KEY AI_MODEL ANTHROPIC_API_KEY; do setvar "$v" ""; done
  echo "ЖИ кілттері серверден алынып тасталды."
  restart
  ;;
*)
  echo "1, 2 немесе 3 деп жазыңыз."; exit 1 ;;
esac
