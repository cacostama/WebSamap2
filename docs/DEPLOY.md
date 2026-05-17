# Deploy — Sanatorio Adventista V2

Guía para llevar el proyecto desde local al servidor propio del usuario.

## Prerrequisitos en el servidor

- Node 20 LTS, pnpm 9
- MySQL 8 (o MariaDB 10.6+)
- Nginx
- PM2 (`npm i -g pm2`)
- Dominio apuntando al servidor (A record)
- Certificado SSL (Let's Encrypt con certbot)

## 1. Configurar MySQL

```sql
CREATE DATABASE sanatorio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sanatorio'@'localhost' IDENTIFIED BY 'PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON sanatorio.* TO 'sanatorio'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Clonar y construir

```bash
cd /var/www
git clone <repo> sanatorio
cd sanatorio
pnpm install --frozen-lockfile
```

Configurar `api/.env`:

```bash
cp api/.env.example api/.env
# editar: DB_*, JWT_SECRET (cambiar!), CORS_ORIGINS=https://sanatorioadventista.com.py
nano api/.env
```

Migrar y sembrar:

```bash
pnpm db:migrate
pnpm db:seed
```

Build:

```bash
pnpm build
```

Esto genera:
- `api/dist/` — backend compilado
- `apps/web/dist/` — sitio público estático
- `apps/admin/dist/` — panel admin estático

## 3. PM2 para la API

```bash
cd /var/www/sanatorio
pm2 start api/dist/index.js --name sanatorio-api --time
pm2 save
pm2 startup  # seguir instrucciones
```

## 4. Nginx

`/etc/nginx/sites-available/sanatorio`:

```nginx
server {
  listen 80;
  server_name sanatorioadventista.com.py www.sanatorioadventista.com.py;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name sanatorioadventista.com.py www.sanatorioadventista.com.py;

  ssl_certificate     /etc/letsencrypt/live/sanatorioadventista.com.py/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/sanatorioadventista.com.py/privkey.pem;

  client_max_body_size 20M;

  # API
  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Uploads (servidos por la API)
  location /uploads/ {
    proxy_pass http://127.0.0.1:4000;
  }

  # Panel admin
  location /admin/ {
    alias /var/www/sanatorio/apps/admin/dist/;
    try_files $uri $uri/ /admin/index.html;
  }

  # Sitio público
  location / {
    root /var/www/sanatorio/apps/web/dist;
    try_files $uri $uri/ /index.html;
  }
}
```

Activar y recargar:

```bash
ln -s /etc/nginx/sites-available/sanatorio /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> **Nota** — si el panel admin queda bajo `/admin/`, hay que construirlo con `vite build --base=/admin/`. Editar `apps/admin/vite.config.ts` para agregar `base: "/admin/"` en producción, o usar `vite build --base=/admin/` en el script `build`.

## 5. SSL con Let's Encrypt

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d sanatorioadventista.com.py -d www.sanatorioadventista.com.py
```

## 6. Backups

Cron diario de MySQL:

```bash
0 3 * * * mysqldump -u sanatorio -p'PASS' sanatorio | gzip > /var/backups/sanatorio_$(date +\%F).sql.gz
```

Backup de `api/uploads/` (rsync semanal a almacenamiento externo).

## 7. Actualizaciones

```bash
cd /var/www/sanatorio
git pull
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pm2 restart sanatorio-api
```

## 8. Verificación post-deploy

- [ ] `https://sanatorioadventista.com.py/` carga el home
- [ ] `https://sanatorioadventista.com.py/admin/` muestra el login
- [ ] `https://sanatorioadventista.com.py/api/health` devuelve `{ok:true}`
- [ ] Cambiar la contraseña del admin sembrado y crear usuarios reales
- [ ] Subir el logo definitivo y configurar branding completo
- [ ] Crear contenido inicial (médicos, noticias) desde el admin

## Variables de entorno producción

| Variable | Valor sugerido |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DB_HOST` | `127.0.0.1` |
| `DB_USER` | `sanatorio` |
| `DB_NAME` | `sanatorio` |
| `JWT_SECRET` | `<random 64 chars>` |
| `CORS_ORIGINS` | `https://sanatorioadventista.com.py` |
| `PUBLIC_BASE_URL` | `https://sanatorioadventista.com.py` |
| `UPLOAD_DIR` | `/var/www/sanatorio/api/uploads` |
