# AGENTS.md — Contexto del proyecto y flujo multi-agente

> **Lectura obligatoria para cualquier IA o desarrollador antes de tocar este repo.**
> Este archivo es el punto de entrada: explica qué es el proyecto, cómo está armado, y cómo se debe trabajar con un flujo de 4 agentes especializados.

---

## 1. ¿Qué es este proyecto?

Sitio web institucional + panel de administrador **100 % paramétrico** para el **Sanatorio Adventista de Asunción** (Paraguay).

Se construyó unificando tres referencias (todas son snapshots HTML, no código fuente):

| Carpeta | Sitio real | Rol |
|---|---|---|
| `WebArgentina/` | Sanatorio Adventista del Plata (Webflow) | Estructura visual + paleta primaria (navy `#004884`) |
| `WebHoenau/` | Sanatorio Adventista de Hohenau (SPA) | Funcionalidades simples (turno rápido) |
| `websamapAsu/` | Sanatorio Adventista de Asunción (Bootstrap) | **Datos reales**: logos, imágenes, 90+ médicos, especialidades, branding |

**Resultado**: un nuevo sitio que toma la estructura/estilo de Argentina, las features de los tres, y los datos/branding de Asunción — todo editable desde un admin.

---

## 2. Stack y arquitectura

**Monorepo pnpm workspaces.**

```
WebSantarioV2/
├── api/                  Node 20 + Express + TypeScript + Knex + MySQL 8 + JWT
│   ├── migrations/       Schema en TS (knex)
│   ├── seeds/            01_users_and_settings, 02_specialties_doctors, 03_pages_and_content
│   ├── src/routes/
│   │   ├── public.ts     Endpoints públicos (settings, pages/:slug, doctors, etc.)
│   │   ├── auth.ts       Login JWT
│   │   └── admin/        12 routers protegidos
│   └── uploads/          Archivos subidos (logos, fotos, imágenes)
│
├── apps/
│   ├── web/              React 18 + Vite + Tailwind + TanStack Query
│   │   └── src/blocks/   19 bloques renderizables (Hero, Cards, DoctorList, …)
│   └── admin/            React 18 + Vite + Tailwind + dnd-kit + Tiptap
│       └── src/pages/    Páginas del panel (PageBuilder, Settings, Doctors, …)
│
├── shared/types/         Tipos TS compartidos (blocks.ts es la fuente de verdad
│                         de qué bloques existen y qué props acepta cada uno)
│
├── scripts/              extract-assets.ts (imágenes base64 → archivos)
│                         extract-doctors.ts (HTML guía médica → JSON seed)
│
├── assets-extracted/     Salida de los scripts (imágenes + data JSON)
├── docs/DEPLOY.md        Guía Nginx + PM2 + MySQL + Let's Encrypt
└── AGENTS.md             ← este archivo
```

**Puertos locales**: API `4000`, web `5173`, admin `5174`.

**Credenciales seed**: `admin@sanatorio.local` / `admin1234` (cambiar en producción).

---

## 3. Conceptos clave

### Sistema de bloques (page builder)
- Cada **página** del sitio público se compone de un arreglo ordenado de **bloques**.
- Cada bloque tiene `type` (string) + `props` (JSON).
- Los tipos disponibles están en [`shared/types/blocks.ts`](shared/types/blocks.ts) en `BLOCK_REGISTRY`. **Agregar uno nuevo requiere 3 pasos**:
  1. Definir tipo + interface de props en `shared/types/blocks.ts` y registrarlo en `BLOCK_REGISTRY`.
  2. Crear el componente React en `apps/web/src/blocks/<Nombre>.tsx` y registrarlo en `BlockRenderer.tsx`.
  3. Definir el schema del editor de props en `apps/admin/src/components/BlockPropsEditor.tsx`.

### Theming en runtime
- El admin guarda colores/tipografías en `settings.theme`.
- `apps/web/src/api.ts` → `applyTheme()` convierte hex → `R G B` y los inyecta en CSS variables (`--c-primary`, `--f-heading`, etc.).
- Tailwind usa esas variables como tokens (`bg-primary`, `text-ink`). **Cambiar color en admin = sitio actualiza al refresh, sin rebuild.**

### Almacenamiento
- **MySQL** para todo el contenido estructurado (médicos, páginas, bloques, settings JSON, etc.).
- **Filesystem** (`api/uploads/`) para imágenes/PDFs, servidos como estáticos por la API y proxied por Nginx en prod.

---

## 4. Cómo correr el proyecto

```bash
pnpm install
cp api/.env.example api/.env        # editar credenciales MySQL
pnpm extract:assets                  # opcional: extrae imágenes de los HTML
pnpm extract:doctors                 # opcional: genera seed de médicos
pnpm db:migrate
pnpm db:seed
pnpm dev                             # api+web+admin en paralelo
```

Para deploy ver [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## 5. Flujo multi-agente OBLIGATORIO

Cualquier cambio no trivial **debe** pasar por estos 4 agentes en orden. Si trabajás con Claude Code, usar `Agent` con `subagent_type` correspondiente; si trabajás con otra IA, crear un agente/rol por fase.

### Agente 1 — **Analista** (`Explore` o equivalente read-only)
**Propósito**: entender el pedido, mapear el código actual, identificar archivos a tocar y patrones existentes a reusar.

**Inputs**: la tarea del usuario.
**Outputs** (texto, sin tocar archivos):
- Resumen del pedido en una línea
- Lista de archivos relevantes con rutas exactas y líneas clave
- Patrones existentes que conviene reusar (CRUD genérico, BlockPropsEditor, applyTheme, etc.)
- Riesgos/edge cases detectados
- Lista de tests que se deberían escribir o ejecutar

**Reglas**:
- Solo lectura. NO modifica archivos.
- Debe leer este `AGENTS.md`, `shared/types/blocks.ts`, y la migration init antes de cualquier análisis.
- Si la tarea es ambigua, pide aclaración antes de pasar al siguiente agente.

### Agente 2 — **Desarrollador** (`general-purpose` o equivalente con write)
**Propósito**: implementar la tarea según el análisis del Agente 1.

**Inputs**: el plan del Analista.
**Outputs**: cambios en archivos + lista de tests a correr.

**Reglas obligatorias**:
- Respetar el patrón de bloques (3 pasos si se agrega un bloque nuevo).
- Tipos en `shared/types/` cuando sean compartidos.
- Validar payloads con Zod en endpoints admin nuevos.
- Reusar `SimpleCrud`, `BlockPropsEditor`, `applyTheme`, `crudRouter` antes de duplicar.
- **Nunca** romper la firma de un endpoint público sin actualizar el consumer.
- **No** commitear secrets ni archivos de `api/uploads/`.

### Agente 3 — **Tester** (`general-purpose` con permisos de ejecución)
**Propósito**: verificar que lo del Agente 2 funciona end-to-end.

**Pasos mínimos**:
1. `pnpm --filter @sa/api migrate` (si hubo cambios de schema)
2. Build/typecheck: `pnpm --filter @sa/web build` y/o `pnpm --filter @sa/admin build` y/o `tsc -p api/tsconfig.json --noEmit`
3. Levantar API + smoke tests con `curl`:
   - `curl localhost:4000/api/health`
   - `curl localhost:4000/api/public/settings`
   - `curl localhost:4000/api/public/pages/home`
   - Login: `curl -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@sanatorio.local","password":"admin1234"}'`
   - Endpoint admin tocado, con `Authorization: Bearer <token>`
4. Si la tarea tocó UI: levantar `pnpm dev:web` y/o `pnpm dev:admin`, abrir en browser, verificar el flujo crítico (golden path) y al menos un edge case.
5. Reportar PASS/FAIL por punto, con logs.

**Reglas**:
- Si algo falla, NO arreglar — pasar al Agente 4 con el error completo.
- Si algo pasa pero tiene warnings, reportarlos al Agente 4 igual.

### Agente 4 — **Corrector** (`general-purpose` con write)
**Propósito**: arreglar los fallos reportados por el Tester.

**Reglas**:
- Lee el reporte del Agente 3 + los archivos relacionados (NO repetir todo el trabajo del Analista, asumir su contexto).
- Aplica el mínimo cambio que arregla el fallo. Si encuentra un problema más profundo, lo flagea pero no lo arregla en el mismo loop (crear ticket aparte).
- Después de corregir, **devolver al Agente 3** para re-test.
- Máximo 3 ciclos Tester ↔ Corrector. Si al 3er ciclo sigue fallando, escalar al humano con resumen claro de qué se intentó.

---

## 6. Reglas transversales (todos los agentes)

- **Idioma**: el código en inglés, las strings de UI en español (es-PY).
- **No reformatear** archivos que no se están editando.
- **No agregar dependencias** sin justificar — preferir lo que ya está en `package.json`.
- **No crear archivos .md de planning** salvo que el usuario lo pida explícitamente. Este `AGENTS.md` es la excepción.
- **Branding** (lineamientos Adventist Health, no negociables salvo decisión del cliente):
  - **Primario**: Pantone **7462 C** → `#005587` (navy)
  - **Secundario**: Pantone **311 C** → `#00B5DA` (cyan)
  - Accent `#f5543f` (coral) opcional, cambiable.
- **Tipografía** (también Adventist Health):
  - **Headings**: **Work Sans** (peso `600`/`700`)
  - **Body**: **Open Sans** (peso `400`/`600`)
  - Ambas fuentes se preloadean desde Google Fonts en los `index.html`.
- **Datos sensibles**: el seed mete un superadmin con password trivial. **Nunca** dejarlo así en prod.
- **Migraciones**: nuevas tablas o columnas → archivo nuevo en `api/migrations/` con timestamp creciente. NO editar migrations ya aplicadas.

---

## 7. Skills disponibles en este entorno

Si la IA que abre el repo está corriendo en Claude Code con la configuración actual del usuario, dispone de las siguientes **skills** (se invocan con `/<nombre>` o vía la herramienta `Skill`). Usarlas en lugar de reimplementar funcionalidad equivalente.

### Configuración del entorno
| Skill | Cuándo usarla |
|---|---|
| `update-config` | Modificar `settings.json` / `settings.local.json`: permisos, hooks, env vars, comportamientos automáticos ("from now on when X…"). Ejemplos: "allow npm commands", "set DEBUG=true", "when Claude stops show X". |
| `keybindings-help` | Personalizar `~/.claude/keybindings.json` (rebind keys, agregar chords). |
| `fewer-permission-prompts` | Escanea transcripts y arma un allowlist de Bash/MCP read-only en `.claude/settings.json` para reducir prompts. |

### Calidad de código
| Skill | Cuándo usarla |
|---|---|
| `simplify` | Revisar el código que se cambió en busca de reuso, calidad y eficiencia, y arreglar lo que aparezca. **Buen complemento del Agente 4 (Corrector).** |
| `review` | Code review de un pull request. |
| `security-review` | Security review de los cambios pendientes en la branch actual. **Correr antes de cualquier deploy a producción.** |
| `init` | Inicializar un `CLAUDE.md` con documentación del codebase (no necesario acá, ya tenemos `AGENTS.md`). |

### Programación recurrente / loops
| Skill | Cuándo usarla |
|---|---|
| `loop` | Correr un prompt o slash command en intervalo (ej. `/loop 5m /foo`). Para tareas recurrentes o polling de estado. |
| `schedule` / `anthropic-skills:schedule` | Crear/editar/listar agentes remotos programados (cron jobs en la nube). También sirve para runs únicos ("recordame mañana a las 3pm"). |

### Producción de documentos (output deliverables)
| Skill | Cuándo usarla |
|---|---|
| `anthropic-skills:pptx` | Cualquier cosa que toque archivos `.pptx` (crear/leer/editar slides, pitch decks, presentaciones). |
| `anthropic-skills:docx` | Cualquier cosa que toque archivos `.docx` (reportes, memos, cartas, templates en Word). |
| `anthropic-skills:pdf` | Cualquier cosa con PDFs: extraer texto/tablas, merge/split, rotar, watermark, OCR, fill forms, encriptar. |
| `anthropic-skills:xlsx` | Cualquier cosa con spreadsheets (`.xlsx`, `.xlsm`, `.csv`, `.tsv`): leer, editar, agregar fórmulas, limpiar data, generar reportes. |

### Anthropic API / SDK
| Skill | Cuándo usarla |
|---|---|
| `claude-api` | Construir, debuggear u optimizar apps que usan la Claude API / Anthropic SDK. Incluye prompt caching, thinking, tool use, batch, migración entre versiones de modelo. |

### Memoria del agente
| Skill | Cuándo usarla |
|---|---|
| `anthropic-skills:consolidate-memory` | Pasada reflexiva sobre los archivos de memoria del agente: merge de duplicados, fix de hechos viejos, poda del índice. Correr cada tanto si la memoria crece. |
| `anthropic-skills:skill-creator` | Crear skills nuevas, modificar existentes, correr evals/benchmarks, optimizar descripción para mejor triggering. |
| `anthropic-skills:setup-cowork` | Setup guiado de Cowork (plugins por rol, conectar herramientas). |

### Cuándo NO usar una skill
- Tareas triviales que se resuelven con una edición directa.
- Cuando el agente del flujo (Analista/Dev/Tester/Corrector) ya cubre el caso.
- Si el nombre no aparece exacto en este listado o el listado del system-reminder de la sesión actual: NO inventar. Solo invocar skills que estén activas en el entorno.

---

## 8. Estado actual (al 2026-05-16)

✅ Estructura del monorepo, scripts de extracción, schema MySQL, seeds, API completa (público + admin + auth), frontend público con 19 bloques + páginas dinámicas + buscador de médicos, panel admin completo con page builder DnD, Tiptap, CRUDs, gestor de medios, usuarios.
✅ Documentación de deploy en [`docs/DEPLOY.md`](docs/DEPLOY.md).

🔲 Tests automatizados (no hay; los agentes hacen smoke testing manual por ahora).
🔲 Optimización de imágenes en upload (sharp ya está como dep, falta integrar).
🔲 Contenido real seed (las imágenes y los textos definitivos los carga el cliente desde el admin).
