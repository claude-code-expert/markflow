# MarkFlow KMS

[한국어](./README.md) | **English**

A markdown-based team Knowledge Management System (KMS).

## Screenshots

### 1. Sign In
![Sign in screen](./apps/web/public/image/0.png)

### 2. Workspaces
![Workspaces screen](./apps/web/public/image/1.png)

### 3. Document List
![Document list screen](./apps/web/public/image/2.png)

### 4. Document Detail
![Document detail screen](./apps/web/public/image/3.png)

### 5. Document Editor
![Document editor screen](./apps/web/public/image/4.png)

## Repository Layout

```
markflow/
├── packages/
│   ├── editor/          @markflow/editor — standalone editor component (publishable to npm)
│   └── db/              @markflow/db — Drizzle ORM schema + migrations + SCHEMA.sql
├── apps/
│   ├── web/             @markflow/web — Next.js 16 frontend (App Router)
│   ├── api/             @markflow/api — Fastify 5 backend API
│   ├── worker/          Cloudflare R2 image upload Worker (optional)
│   └── demo/            Editor demo app
└── docs/                Design docs, prototypes, ERD
```

## Local Editor Feature Tests

```bash
./scripts/item-test.sh all        # All 28 tests
./scripts/item-test.sh bold       # Bold only
./scripts/item-test.sh strike     # Strikethrough only
./scripts/item-test.sh list       # UL + OL + Task list
./scripts/item-test.sh int        # Integration test (22 cases in one document)
./scripts/item-test.sh help       # Full command list
```

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL 16+

### 1. PostgreSQL Setup (one-time)

```bash
psql -h localhost -p 5432 -U postgres
```

```sql
CREATE USER markflow WITH PASSWORD 'markflow';
CREATE DATABASE markflow OWNER markflow;
GRANT ALL PRIVILEGES ON DATABASE markflow TO markflow;
\q
```

### 2. Environment Variables

The `.env.local` file at the repo root holds the local config. Adjust to your environment:

```env
DATABASE_URL=postgresql://markflow:markflow@localhost:5432/markflow
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
HOST=0.0.0.0
PORT=4000
```

### 3. Install & Run

```bash
pnpm install
pnpm --filter @markflow/editor build   # Build the editor package (one-time)

# Bootstrap the DB — pick one
psql "$DATABASE_URL" -f packages/db/SCHEMA.sql      # (a) one-shot create on an empty DB
cd packages/db && pnpm drizzle-kit push && cd ../.. # (b) incremental via Drizzle

pnpm dev                                # Start API + Web together
```

Visit http://localhost:3002.

### 4. Create an Account

1. Sign up at http://localhost:3002/register
2. Bypass email verification:
   ```bash
   psql -h localhost -p 5432 -U markflow -d markflow \
     -c "UPDATE users SET email_verified = true;"
   ```
3. Log in at http://localhost:3002/login

## Production Environment Variables

### API server (`apps/api`)

| Variable | Description | How to generate |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection URL | Provided by your DB host (Supabase, Neon, RDS, etc.) |
| `JWT_SECRET` | Access token signing key | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `openssl rand -hex 32` (different from `JWT_SECRET`) |
| `CORS_ORIGIN` | Frontend domain(s), comma-separated | e.g. `https://markflow.vercel.app` |
| `HOST` | API bind address | `0.0.0.0` |
| `PORT` | API port | Platform default or `4000` |

### Web app (`apps/web`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API server base URL | `https://api.markflow.dev/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Site domain (sitemap/SEO) | `https://markflow.vercel.app` |
| `NEXT_PUBLIC_R2_WORKER_URL` | (optional) Image upload Worker | `https://r2-uploader.<id>.workers.dev` |

> `pnpm start` (production) does NOT read `.env.local`; it only reads system environment variables.

## Deployment Architecture

Fastify is a long-running server, so it does not fit Vercel's serverless model. A split deployment is recommended.

| Component | Recommended host |
|-----------|------------------|
| `apps/web` (Next.js) | **Vercel** — set Root Directory to `apps/web`, ensure `@markflow/editor` builds first |
| `apps/api` (Fastify) | **Railway / Render / Fly.io** — Docker or Node runtime |
| PostgreSQL | **Supabase / Neon / Vercel Postgres** |
| `apps/worker` | **Cloudflare Workers** + R2 bucket |

## Commands

```bash
pnpm dev                             # Run everything (API + Web)
pnpm build                           # Build everything
pnpm test                            # Run all tests
pnpm --filter @markflow/api dev      # Backend only
pnpm --filter @markflow/web dev      # Frontend only
pnpm --filter @markflow/editor build # Build the editor package
pnpm --filter @markflow/web test:e2e # E2E tests
```

## Packages

### @markflow/editor

Standalone React Markdown editor component. Drop it into any React 18+ project.

- CodeMirror 6 (source editor)
- remark + rehype (markdown parse/render pipeline)
- KaTeX (math), rehype-highlight (code highlighting)
- rehype-sanitize (XSS protection)

### @markflow/db

Drizzle ORM-based DB schema. 15 tables (users, workspaces, workspace_members, categories, category_closure, documents, document_versions, document_relations, tags, document_tags, comments, invitations, join_requests, embed_tokens, refresh_tokens). For a fresh environment use [SCHEMA.sql](./packages/db/SCHEMA.sql); for incremental migrations use `src/migrations/*.sql`. ERD: [docs/ERD.svg](./docs/ERD.svg)

### @markflow/web

Next.js 16 frontend. Zustand (state), React Query (server state), Tailwind CSS 4.

### @markflow/api

Fastify 5 backend API. JWT auth, RBAC (owner/admin/editor/viewer), document CRUD + version history.

## Documents

| Document | Description |
|----------|-------------|
| [packages/db/SCHEMA.sql](./packages/db/SCHEMA.sql) | Consolidated DB bootstrap SQL (15 tables + FKs + indexes) |
| [docs/ERD.svg](./docs/ERD.svg) | Database ER diagram |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | Detailed project structure |
| [docs/markflow-prototype.html](./docs/markflow-prototype.html) | UI prototype |
