# MarkFlow KMS


### About

<table>
<tr>
<td width="35%" align="center" valign="top">

<img src="https://raw.githubusercontent.com/claude-code-expert/.github/main/profile/assets/cc-master.png" alt="Claude Code Master" width="100%" />

<br/>

<a href="https://product.kyobobook.co.kr/detail/S000219725328" target="_blank"><img src="https://img.shields.io/badge/Claude_Code_Master-Buy_Online-2E75B6?style=for-the-badge&logo=bookstack&logoColor=white" alt="Buy Claude Code Master Online" /></a>

</td>
<td width="65%" valign="top">

**Claude Code Expert** is the official GitHub organization for the book *Claude Code Master — An AI Agentic Coding Workflow That Covers Planning, Development, and Operations End-to-End*.

This book is not just a how-to-use-the-tool tutorial. It lays out a methodology for collaborating systematically with AI coding agents — covering Spec-Driven Development (SDD), Test-Driven Development (TDD), and the kind of disciplined review process that holds up no matter which AI tool you use.
MarkFlow is a Markdown Knowledge Management System — open-source software that lets you easily author markdown documents and manage relationships between them at the folder level, available as a SaaS or for on-premises deployment.

For questions about the book or this project, please reach out at brewnet.dev@gmail.com.

</td>
</tr>
</table>

---


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
│   ├── web/             @markflow/web — Next.js 16.2.1 frontend (App Router + API Routes)
│   └── worker/          Cloudflare R2 image upload Worker (optional)
└── docs/                Design docs, prototypes, ERD
```

> Since v0.4.0, the Fastify server (`apps/api`) has been removed. All API logic is now handled by Next.js App Router Route Handlers, deployed as a single Vercel project.

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

Create `apps/web/.env.local` and adjust to your environment:

```env
DATABASE_URL=postgresql://markflow:markflow@localhost:5432/markflow
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
NEXT_PUBLIC_SITE_URL=http://localhost:3002
```

### 3. Install & Run

```bash
pnpm install
pnpm --filter @markflow/db build       # Build the DB package (one-time)
pnpm --filter @markflow/editor build   # Build the editor package (one-time)

# Bootstrap the DB — pick one
psql "$DATABASE_URL" -f packages/db/SCHEMA.sql      # (a) one-shot create on an empty DB
cd packages/db && pnpm drizzle-kit push && cd ../.. # (b) incremental via Drizzle

pnpm dev                                # Start the web server
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

### Web app (`apps/web`)

Since v0.4.0, the API is integrated into Next.js API Routes. All environment variables are set in `apps/web` only.

| Variable | Description | How to generate |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection URL | Provided by your DB host (Supabase, Neon, RDS, etc.) |
| `JWT_SECRET` | Access token signing key | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `openssl rand -hex 32` (different from `JWT_SECRET`) |
| `NEXT_PUBLIC_SITE_URL` | Site domain (sitemap/SEO) | `https://markflow.vercel.app` |
| `NEXT_PUBLIC_R2_WORKER_URL` | (optional) Image upload Worker | `https://r2-uploader.<id>.workers.dev` |

> `pnpm start` (production) does NOT read `.env.local`; it only reads system environment variables.

## Deployment Architecture

Since v0.4.0, the API is integrated into Next.js API Routes and the entire app deploys as a single Vercel project.

| Component | Recommended host |
|-----------|------------------|
| `apps/web` (Next.js + API Routes) | **Vercel** — Framework Preset: Next.js, Build Command: `pnpm --filter @markflow/db build && pnpm --filter @markflow/editor build && cd apps/web && next build`, Output Directory: `apps/web/.next` |
| PostgreSQL | **Supabase / Neon / Vercel Postgres** |
| `apps/worker` | **Cloudflare Workers** + R2 bucket |

> When deploying to Vercel, leave Root Directory empty (project root) and manually select the Next.js Framework Preset. Setting Root Directory to `apps/web` will break pnpm workspace detection.

## Commands

```bash
pnpm dev                             # Start the web server (port 3002)
pnpm build                           # Build everything
pnpm test                            # Run all tests
pnpm --filter @markflow/web dev      # Web app only
pnpm --filter @markflow/editor build # Build the editor package
pnpm --filter @markflow/db build     # Build the DB package
pnpm --filter @markflow/web test:e2e # E2E tests (Playwright)
```

## Packages

### @markflow/editor

Standalone React Markdown editor component. Drop it into any React 18+ or 19+ project.

- CodeMirror 6 (source editor)
- remark + rehype (markdown parse/render pipeline)
- KaTeX (math), rehype-highlight (code highlighting)
- rehype-sanitize (XSS protection)

### @markflow/db

Drizzle ORM-based DB schema. 15 tables (users, workspaces, workspace_members, categories, category_closure, documents, document_versions, document_relations, tags, document_tags, comments, invitations, join_requests, embed_tokens, refresh_tokens). For a fresh environment use [SCHEMA.sql](./packages/db/SCHEMA.sql); for incremental migrations use `src/migrations/*.sql`. ERD: [docs/ERD.svg](./docs/ERD.svg)

### @markflow/web

Next.js 16.2.1 frontend + API Routes. React 19.2.4, Zustand 5 (state), TanStack Query 5 (server state), Tailwind CSS 4. JWT auth, RBAC (owner/admin/editor/viewer), document CRUD + version history with 50 API route handlers.

## Documents

| Document | Description |
|----------|-------------|
| [packages/db/SCHEMA.sql](./packages/db/SCHEMA.sql) | Consolidated DB bootstrap SQL (15 tables + FKs + indexes) |
| [docs/ERD.svg](./docs/ERD.svg) | Database ER diagram |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | Detailed project structure |
| [docs/markflow-prototype.html](./docs/markflow-prototype.html) | UI prototype |
