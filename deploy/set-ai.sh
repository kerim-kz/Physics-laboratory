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
OPENAI_BASE=${OPENAI_BASE:-https://api.openai.com/v1}
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
  if ! printf '%s' "$KEY" | grep -Eq '^[A-Za-z0-9._-]{20,300}$'; then
    echo "Кілт дұрыс емес сияқты (бос немесе артық таңбалар бар). Кілтті қайта көшіріп, скриптті қайта іске қосыңыз."
    exit 1
  fi
}
# Провайдердің қате хабары (кілтсіз) — себебін түсіну үшін.
msg() { grep -o '"message": *"[^"]*"' "$TMP" | head -1 | sed -E 's#^"message": *"(.*)"$#   Провайдер жауабы: \1#' || true; }
restart() {
  echo "Сайт жаңа баптаулармен қайта іске қосылуда..."
  docker compose up -d app >/dev/null
  echo "Дайын. Сайтта: Әкімші → ЖИ бетінде күйін тексеріңіз."
}

echo "ЖИ провайдерін таңдаңыз:"
echo "  1 — Google Gemini (тегін, ұсынылады)"
echo "  2 — OpenAI ChatGPT (ақылы, арзан)"
echo "  3 — Anthropic Claude (ақылы, ең сапалы)"
echo "  4 — ЖИ-ді өшіру (кілттерді серверден алып тастау)"
read -r -p "Нөмірін жазыңыз (1/2/3/4): " CHOICE

case "$CHOICE" in
1)
  readkey "Google AI Studio кілті (AIza… немесе AQ.…, экранда көрінбейді): "
  echo "Кілт тексерілуде..."
  # Google кілтін екі тәсілмен береді: Authorization: Bearer (ескі AIza… кілттері) немесе x-goog-api-key (жаңа AQ.… кілттері).
  gtry() { curl -s -m 30 -o "$TMP" -w '%{http_code}' -H "$1" "$GOOGLE_BASE/models" || echo 000; }
  AUTH="Authorization: Bearer $KEY"; KEY_HEADER=
  CODE=$(gtry "$AUTH")
  if [ "$CODE" != 200 ] && [ "$CODE" != 000 ]; then
    CODE2=$(gtry "x-goog-api-key: $KEY")
    if [ "$CODE2" = 200 ]; then AUTH="x-goog-api-key: $KEY"; KEY_HEADER=x-goog-api-key; CODE=200; fi
  fi
  if [ "$CODE" != 200 ]; then
    if grep -qi 'location is not supported' "$TMP"; then
      echo "Google бұл сервердің елінен тегін API-ге рұқсат бермейді. 2 немесе 3-жолды таңдаңыз."
    elif [ "$CODE" = 000 ]; then
      echo "Google-ға қосылу мүмкін болмады. Интернетті тексеріп, кейінірек қайталаңыз."
    else
      echo "Google кілтті қабылдамады (код $CODE). Кілтті aistudio.google.com-нан қайта көшіріңіз."
      msg
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
  CODE=$(curl -s -m 60 -o "$TMP" -w '%{http_code}' -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MAIN\",\"messages\":[{\"role\":\"user\",\"content\":\"Тек бір сөзбен жауап бер: сәлем\"}],\"max_tokens\":20}" \
    "$GOOGLE_BASE/chat/completions" || echo 000)
  if [ "$CODE" = 429 ]; then
    echo "Ескерту: бұл модельдің тегін лимиті қазір таусылған (429). Кілт сақталады; лимит ертең жаңарады."
  elif [ "$CODE" = 503 ] || [ "$CODE" = 500 ]; then
    echo "Ескерту: Google-да модель қазір қатты жүктелген ($CODE) — бұл уақытша. Кілт сақталады; сайт қосалқы модельді де қолданады."
  elif [ "$CODE" != 200 ]; then
    echo "Сынақ сұраныс сәтсіз аяқталды (код $CODE). Кілт сақталмады."
    msg
    exit 1
  fi
  setvar AI_BASE_URL "$GOOGLE_BASE"
  setvar AI_API_KEY "$KEY"
  setvar AI_KEY_HEADER "$KEY_HEADER"
  setvar AI_MODEL "$MAIN${SPARE:+,$SPARE}"
  echo "Google AI Studio кілті сақталды."
  restart
  ;;
2)
  readkey "OpenAI кілті (sk-…, экранда көрінбейді): "
  case "$KEY" in sk-*) ;; *) echo "OpenAI кілті sk- деп басталуы керек."; exit 1 ;; esac
  echo "Кілт тексерілуде..."
  CODE=$(curl -s -m 30 -o "$TMP" -w '%{http_code}' -H "Authorization: Bearer $KEY" "$OPENAI_BASE/models" || echo 000)
  if [ "$CODE" != 200 ]; then
    if grep -qi 'unsupported_country\|not supported' "$TMP"; then
      echo "OpenAI бұл сервердің елінен API-ге рұқсат бермейді. 1 немесе 3-жолды таңдаңыз."
    elif [ "$CODE" = 000 ]; then
      echo "OpenAI-ға қосылу мүмкін болмады. Интернетті тексеріп, кейінірек қайталаңыз."
    else
      echo "OpenAI кілтті қабылдамады (код $CODE). Кілтті platform.openai.com-нан қайта көшіріңіз."
    fi
    exit 1
  fi
  # Арзан «mini» модельдерінің ең жаңасы (мысалы, gpt-5-mini), болмаса gpt-4o-mini.
  IDS=$(grep -o '"id": *"[^"]*"' "$TMP" | sed -E 's/.*"([^"]*)"$/\1/')
  MAIN=$(printf '%s\n' "$IDS" | grep -E '^gpt-[0-9.]+-mini$' | sort -Vr | head -1 || true)
  [ -n "$MAIN" ] || MAIN=$(printf '%s\n' "$IDS" | grep -E '^gpt-[0-9.]+o-mini$' | sort -Vr | head -1 || true)
  if [ -z "$MAIN" ]; then
    echo "Қолжетімді модельдер:"
    printf '%s\n' "$IDS" | grep -E '^gpt-' | sort -V | head -30 | sed 's/^/  /'
    read -r -p "Модель атауын жазыңыз: " MAIN
    MAIN=$(printf '%s' "$MAIN" | tr -d '[:space:]')
    printf '%s' "$MAIN" | grep -Eq '^[A-Za-z0-9._-]+$' || { echo "Модель атауы дұрыс емес."; exit 1; }
  fi
  echo "Модель: $MAIN. Сынақ сұраныс жіберілуде..."
  CODE=$(curl -s -m 60 -o "$TMP" -w '%{http_code}' -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
    -d "{\"model\":\"$MAIN\",\"messages\":[{\"role\":\"user\",\"content\":\"Тек бір сөзбен жауап бер: сәлем\"}],\"max_completion_tokens\":300}" \
    "$OPENAI_BASE/chat/completions" || echo 000)
  if [ "$CODE" = 429 ] && grep -q 'insufficient_quota' "$TMP"; then
    echo "Ескерту: OpenAI балансында қаражат жоқ. platform.openai.com → Billing бетінде балансты толтырыңыз. Кілт сақталады."
  elif [ "$CODE" = 429 ]; then
    echo "Ескерту: OpenAI лимиті уақытша таусылған (429). Кілт сақталады."
  elif [ "$CODE" != 200 ]; then
    echo "Сынақ сұраныс сәтсіз аяқталды (код $CODE). Кілт сақталмады."
    exit 1
  fi
  setvar AI_BASE_URL "$OPENAI_BASE"
  setvar AI_KEY_HEADER ""
  setvar AI_API_KEY "$KEY"
  setvar AI_MODEL "$MAIN"
  echo "OpenAI (ChatGPT) кілті сақталды. Шығынды platform.openai.com → Usage бетінен бақылаңыз, Limits бөлімінде айлық шек қойыңыз."
  restart
  ;;
3)
  readkey "Anthropic кілті (sk-ant-…, экранда көрінбейді): "
  case "$KEY" in sk-ant-*) ;; *) echo "Anthropic кілті sk-ant- деп басталуы керек."; exit 1 ;; esac
  echo "Кілт тексерілуде..."
  CODE=$(curl -s -m 30 -o "$TMP" -w '%{http_code}' -H "x-api-key: $KEY" -H 'anthropic-version: 2023-06-01' "$ANTHROPIC_BASE/v1/models" || echo 000)
  if [ "$CODE" != 200 ]; then
    echo "Anthropic кілтті қабылдамады (код $CODE). Кілтті console.anthropic.com-нан қайта көшіріңіз."
    exit 1
  fi
  setvar ANTHROPIC_API_KEY "$KEY"
  # OpenAI-үйлесімді провайдер (Gemini/ChatGPT) бірінші орында тұратындықтан, оның баптауларын тазалаймыз.
  setvar AI_BASE_URL ""
  setvar AI_API_KEY ""
  setvar AI_MODEL ""
  setvar AI_KEY_HEADER ""
  echo "Anthropic кілті сақталды. Модельді сайттағы Әкімші → ЖИ бетінде таңдайсыз."
  restart
  ;;
4)
  for v in AI_BASE_URL AI_API_KEY AI_KEY_HEADER AI_MODEL ANTHROPIC_API_KEY; do setvar "$v" ""; done
  echo "ЖИ кілттері серверден алынып тасталды."
  restart
  ;;
*)
  echo "1, 2, 3 немесе 4 деп жазыңыз."; exit 1 ;;
esac
