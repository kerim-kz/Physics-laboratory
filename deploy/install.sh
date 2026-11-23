#!/usr/bin/env bash
# Ғылым Ордасы — Ubuntu 22.04/24.04 серверіне алғашқы орнату.
# Іске қосу (root ретінде):  bash install.sh
# Не істейді: Docker орнатады, брандмауэрді баптайды, GitHub-тан сайт кодын алады,
# баптаулар файлын (.env) жасайды, сайтты іске қосады және күнделікті резервтік көшірмені қосады.
set -euo pipefail

REPO_SSH="git@github.com:kerim-kz/Physics-laboratory.git"
APP_DIR=/opt/gylym
BACKUP_DIR=/opt/gylym-backups

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Бұл скриптті root ретінде іске қосыңыз (sudo bash install.sh)."; exit 1; }

say "1/7. Жүйені жаңарту және қажетті бағдарламалар"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw openssl cron

say "2/7. Docker орнату"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

say "3/7. Брандмауэр: тек SSH (22), HTTP (80), HTTPS (443)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable

say "4/7. GitHub-қа қосылу кілті (тек оқуға арналған deploy key)"
mkdir -p /root/.ssh && chmod 700 /root/.ssh
if [ ! -f /root/.ssh/gylym_deploy ]; then
  ssh-keygen -t ed25519 -N "" -C "gylym-server" -f /root/.ssh/gylym_deploy >/dev/null
fi
cat > /root/.ssh/config <<CFG
Host github.com
  IdentityFile /root/.ssh/gylym_deploy
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
CFG
chmod 600 /root/.ssh/config
if [ ! -d "$APP_DIR/.git" ]; then
  echo
  echo "Төмендегі ҚОҒАМДЫҚ кілтті көшіріп, GitHub-та қосыңыз:"
  echo "  Репозиторий → Settings → Deploy keys → Add deploy key (Allow write access белгісін ҚОЙМАҢЫЗ)"
  echo
  cat /root/.ssh/gylym_deploy.pub
  echo
  read -r -p "Кілтті қосып болған соң Enter басыңыз..." _
  until git clone -q "$REPO_SSH" "$APP_DIR"; do
    read -r -p "GitHub кілтті әлі қабылдамады. Тексеріп, қайта Enter басыңыз..." _
  done
fi

say "5/7. Баптаулар (.env)"
ENV_FILE="$APP_DIR/deploy/.env"
if [ ! -f "$ENV_FILE" ]; then
  read -r -p "Домен [gylymordasy.com.kz]: " DOMAIN; DOMAIN=${DOMAIN:-gylymordasy.com.kz}
  read -r -p "Платформа иесінің логині (Render-дегімен бірдей): " ADMIN_LOGIN
  read -r -s -p "Платформа иесінің құпиясөзі (экранда көрінбейді): " ADMIN_PASSWORD; echo
  read -r -p "Платформа иесінің аты-жөні [Платформа иесі]: " ADMIN_NAME; ADMIN_NAME=${ADMIN_NAME:-Платформа иесі}
  umask 077
  cat > "$ENV_FILE" <<ENV
DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$(openssl rand -hex 24)
ADMIN_LOGIN=$ADMIN_LOGIN
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_NAME=$ADMIN_NAME
FILE_STORAGE=db
MAX_UPLOAD_MB=20
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
ANTHROPIC_API_KEY=
ENV
  echo "Баптаулар сақталды: $ENV_FILE (ЖИ кілттерін кейін осы файлға жазуға болады)."
fi

say "6/7. Сайтты іске қосу (алғашқы құрастыру 2–5 минут алады)"
cd "$APP_DIR/deploy"
docker compose up -d --build

say "7/7. Күнделікті резервтік көшірме (түнгі 03:30, соңғы 14 күн сақталады)"
mkdir -p "$BACKUP_DIR"
chmod +x "$APP_DIR"/deploy/*.sh
cat > /etc/cron.d/gylym-backup <<CRON
30 3 * * * root $APP_DIR/deploy/backup.sh >> /var/log/gylym-backup.log 2>&1
CRON

DOMAIN_SHOW=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)
say "Дайын!"
echo "Сайт: https://$DOMAIN_SHOW (доменнің DNS жазбалары осы серверге бағытталған болуы керек)."
echo "Күйін тексеру:   cd $APP_DIR/deploy && docker compose ps"
echo "Render-ден деректерді көшіру:   bash $APP_DIR/deploy/restore-from-render.sh"
