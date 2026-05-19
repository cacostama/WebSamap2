#!/usr/bin/env bash
# ============================================================================
# Update deploy — actualiza el VPS a la última versión del repo
# Pulla cambios, corre migrations nuevas si hay, rebuild y reinicia PM2.
# NO resembra la DB (no pisa contenido editado desde el admin).
#
# Uso (como root, en el VPS):
#   bash /var/www/sanatorio/scripts/deploy/update-vps.sh
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/sanatorio}"
BRANCH="${BRANCH:-main}"

log() { echo -e "\033[1;34m==>\033[0m $*"; }
die() { echo -e "\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

[ -d "$APP_DIR/.git" ] || die "$APP_DIR no es un repo git. ¿Corriste setup-vps.sh primero?"

cd "$APP_DIR"

log "1/5  git pull (rama ${BRANCH})"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/${BRANCH}"

# Bash carga el script en memoria al inicio. Si el propio update-vps.sh
# cambió en este pull, hay que re-ejecutar la versión nueva — sino los
# fixes al script se aplicarían recién en el próximo deploy.
SELF="$APP_DIR/scripts/deploy/update-vps.sh"
if [ "${REEXECED:-0}" != "1" ] && [ -f "$SELF" ]; then
  CURRENT_HASH=$(sha256sum "$SELF" | awk '{print $1}')
  RUNNING_HASH=$(sha256sum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  if [ -n "$RUNNING_HASH" ] && [ "$CURRENT_HASH" != "$RUNNING_HASH" ]; then
    log "    el script cambió en este pull → re-ejecutando versión nueva"
    REEXECED=1 exec bash "$SELF" "$@"
  fi
fi

log "2/5  pnpm install"
pnpm install --frozen-lockfile || pnpm install

log "3/5  Migraciones de DB (idempotente)"
pnpm db:migrate

log "4/5  Builds"
pnpm --filter @sa/api build
pnpm --filter @sa/web exec vite build
pnpm --filter @sa/admin exec vite build --base=/admin/

log "5/5  Reload Nginx + restart PM2"
nginx -t && systemctl reload nginx
# Resolver entry según donde tsc haya emitido
ENTRY="$APP_DIR/api/dist/src/index.js"
[ -f "$ENTRY" ] || ENTRY="$APP_DIR/api/dist/index.js"
# IMPORTANTE: --cwd para que dotenv encuentre api/.env
pm2 delete sanatorio-api 2>/dev/null || true
pm2 start "$ENTRY" --name sanatorio-api --time --cwd "$APP_DIR/api"
pm2 save

sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/health" || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "\033[1;32m✅ Update OK · /api/health = 200\033[0m"
else
  echo -e "\033[1;33m⚠ Healthcheck devolvió ${HEALTH} · revisá pm2 logs sanatorio-api\033[0m"
fi
