# Sanatorio Adventista de Asunción — Web V2

Sitio web institucional con panel de administrador paramétrico.

## Stack

- **Frontend público** (`apps/web`): React 18 + Vite + TypeScript + Tailwind + TanStack Query
- **Panel admin** (`apps/admin`): React 18 + Vite + TypeScript + Tailwind + Tiptap + dnd-kit
- **API** (`api`): Node 20 + Express + TypeScript + Knex + MySQL + JWT
- **DB**: MySQL 8

## Estructura

```
apps/web      → sitio público (puerto 5173)
apps/admin    → panel admin (puerto 5174)
api           → REST API (puerto 4000)
db            → migrations + seeds
shared/types  → tipos TS compartidos
scripts       → extracción de assets/datos desde HTML referencia
assets-extracted → logos e imágenes extraídos
```

## Setup local

```bash
pnpm install
cp api/.env.example api/.env   # configurar MySQL local
pnpm extract:assets             # saca imágenes base64 de los HTML de referencia
pnpm extract:doctors            # genera seeds de médicos
pnpm db:migrate
pnpm db:seed
pnpm dev                        # arranca api+web+admin en paralelo
```

- Público: http://localhost:5173
- Admin:   http://localhost:5174 (login: `admin@sanatorio.local` / `admin1234`)
- API:     http://localhost:4000

## Deploy

Ver `docs/DEPLOY.md` (se genera en Fase 4).

## Fuentes de referencia

- `WebArgentina/` — HTML del Sanatorio del Plata (estructura y estilo base)
- `WebHoenau/`    — HTML del Sanatorio de Hohenau (funcionalidades)
- `websamapAsu/`  — HTML del Sanatorio de Asunción (datos, logos, imágenes)
