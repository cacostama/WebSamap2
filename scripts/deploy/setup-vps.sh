#!/usr/bin/env bash
# ============================================================================
# Bootstrap deploy para Sanatorio Adventista V2 — VPS Ubuntu 22/24
#
# Uso (como root):
#   curl -fsSL https://raw.githubusercontent.com/cacostama/WebSamap2/main/scripts/deploy/setup-vps.sh | bash
#
# O bajando el script primero:
#   wget https://raw.githubusercontent.com/cacostama/WebSamap2/main/scripts/deploy/setup-vps.sh
#   chmod +x setup-vps.sh
#   ./setup-vps.sh
#
# Deja corriendo:
#   - MySQL 8 con DB sanatorio
#   - API Node bajo PM2 (puerto 4000)
#   - Nginx sirviendo el sitio público en :80 y /admin
# ============================================================================
set -euo pipefail

# --- Configuración --------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/cacostama/WebSamap2.git}"
APP_DIR="${APP_DIR:-/var/www/sanatorio}"
BRANCH="${BRANCH:-main}"

DB_NAME="sanatorio"
DB_USER="sanatorio"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)}"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sanatorio.local}"
ADMIN_PASS="${ADMIN_PASS:-Thiago.190918}"
ADMIN_NAME="${ADMIN_NAME:-Administrador}"

SERVER_IP="${SERVER_IP:-$(curl -s4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')}"

log()  { echo -e "\033[1;34m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
die()  { echo -e "\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Este script necesita root. Probá: sudo bash $0"

# --- 1. Sistema -----------------------------------------------------------
log "1/9  Actualizando sistema"
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq

# --- 2. Dependencias base -------------------------------------------------
log "2/9  Instalando dependencias base (git, nginx, mysql, ufw, openssl)"
apt install -y -qq curl ca-certificates gnupg git nginx mysql-server ufw openssl

# --- 3. Node 20 + pnpm + pm2 ----------------------------------------------
log "3/9  Instalando Node 20, pnpm y PM2"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y -qq nodejs
fi
npm install -g pnpm@9 pm2 >/dev/null 2>&1
log "    Node $(node -v) · pnpm $(pnpm -v) · pm2 $(pm2 -v)"

# --- 4. MySQL -------------------------------------------------------------
log "4/9  Configurando MySQL"
systemctl enable --now mysql
mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

# --- 5. Clonar / actualizar repo ------------------------------------------
log "5/9  Clonando repo en ${APP_DIR}"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git reset --hard "origin/${BRANCH}"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# --- 6. Configurar .env ---------------------------------------------------
log "6/9  Escribiendo api/.env"
cat > "${APP_DIR}/api/.env" <<EOF
PORT=4000
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

UPLOAD_DIR=${APP_DIR}/api/uploads
MAX_UPLOAD_MB=10

CORS_ORIGINS=http://${SERVER_IP}
PUBLIC_BASE_URL=http://${SERVER_IP}
PUBLIC_SITE_URL=http://${SERVER_IP}

SEED_ADMIN_EMAIL=${ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${ADMIN_PASS}
SEED_ADMIN_NAME=${ADMIN_NAME}
EOF
chmod 600 "${APP_DIR}/api/.env"

# --- 7. Install, migrate, seed, build -------------------------------------
log "7/9  Instalando deps + migrando DB + build de los 3 paquetes"
cd "$APP_DIR"
pnpm install --frozen-lockfile || pnpm install

pnpm db:migrate

# Solo sembrar la primera vez (si no hay marker)
SEED_MARKER="${APP_DIR}/.seeded"
if [ ! -f "$SEED_MARKER" ]; then
  log "    Primera ejecución → sembrando DB"
  pnpm db:seed
  touch "$SEED_MARKER"
else
  log "    DB ya sembrada antes (${SEED_MARKER} existe) → skip"
fi

log "    Building API"
pnpm --filter @sa/api build

log "    Building web (raíz /)"
pnpm --filter @sa/web exec vite build

log "    Building admin (raíz /admin/)"
pnpm --filter @sa/admin exec vite build --base=/admin/

mkdir -p "${APP_DIR}/api/uploads"
chown -R www-data:www-data "${APP_DIR}/api/uploads" || true

# --- 8. Nginx -------------------------------------------------------------
log "8/9  Configurando Nginx"
cat > /etc/nginx/sites-available/sanatorio <<NGINX
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  client_max_body_size 20M;

  # API (^~ para que gane prioridad sobre la regex de assets estáticos)
  location ^~ /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }

  # Uploads servidos por la API (^~ obligatorio para imágenes)
  location ^~ /uploads/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host \$host;
    proxy_http_version 1.1;
    expires 30d;
    add_header Cache-Control "public";
  }

  # SEO endpoints servidos por la API
  location = /robots.txt    { proxy_pass http://127.0.0.1:4000; }
  location = /sitemap.xml   { proxy_pass http://127.0.0.1:4000; }

  # Panel admin (^~ para que /admin/assets/*.js no caigan en la regex global)
  location ^~ /admin {
    alias ${APP_DIR}/apps/admin/dist;
    try_files \$uri \$uri/ /admin/index.html;
  }

  # Sitio público (catch-all)
  location / {
    root ${APP_DIR}/apps/web/dist;
    try_files \$uri \$uri/ /index.html;
  }

  # Cache de assets estáticos del sitio público (sólo extensiones, no /uploads/)
  location ~* \.(?:css|js|woff2?|ttf|otf|eot|svg|webp|ico)\$ {
    root ${APP_DIR}/apps/web/dist;
    try_files \$uri =404;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
NGINX

ln -sf /etc/nginx/sites-available/sanatorio /etc/nginx/sites-enabled/sanatorio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- 9. PM2 + firewall ----------------------------------------------------
log "9/9  Arrancando API con PM2 y configurando firewall"
cd "${APP_DIR}/api"
pm2 delete sanatorio-api 2>/dev/null || true
# tsc emite a dist/src/index.js cuando rootDir=. y se incluyen migrations/seeds
ENTRY="dist/src/index.js"
[ -f "$ENTRY" ] || ENTRY="dist/index.js"
pm2 start "$ENTRY" --name sanatorio-api --time --cwd "${APP_DIR}/api"
pm2 save
# Auto-start al reboot
pm2 startup systemd -u root --hp /root 2>&1 | grep -E "^sudo " | bash || true

ufw --force enable >/dev/null 2>&1 || true
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp  >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true

# --- Health check ---------------------------------------------------------
sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/health" || echo "000")

echo ""
echo "========================================================"
if [ "$HEALTH" = "200" ]; then
  echo -e "\033[1;32m✅ Deploy completo y funcionando\033[0m"
else
  echo -e "\033[1;33m⚠ Deploy completo pero healthcheck devolvió ${HEALTH}\033[0m"
  echo "  Revisá:  pm2 logs sanatorio-api"
fi
echo "========================================================"
echo "Sitio público:   http://${SERVER_IP}"
echo "Panel admin:     http://${SERVER_IP}/admin"
echo "API health:      http://${SERVER_IP}/api/health"
echo ""
echo "Login admin:"
echo "  email:    ${ADMIN_EMAIL}"
echo "  password: ${ADMIN_PASS}"
echo ""
echo "Credenciales DB MySQL (guardadas en ${APP_DIR}/api/.env):"
echo "  DB:       ${DB_NAME}"
echo "  user:     ${DB_USER}"
echo "  pass:     ${DB_PASS}"
echo ""
echo "JWT_SECRET generado: guardado en ${APP_DIR}/api/.env"
echo "========================================================"
echo ""
echo "Próximos comandos útiles:"
echo "  pm2 logs sanatorio-api      → ver logs"
echo "  pm2 restart sanatorio-api   → reiniciar API"
echo "  systemctl reload nginx      → recargar Nginx"
echo "  bash ${APP_DIR}/scripts/deploy/update-vps.sh → actualizar a la última versión del repo"
echo "========================================================"
