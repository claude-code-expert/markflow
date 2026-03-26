# Quickstart: KMS SaaS Platform

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (PostgreSQL + Redis)

## 1. Clone & Install

```bash
git clone <repo-url> markflow-editor
cd markflow-editor
pnpm install
```

## 2. Start Infrastructure

```bash
docker compose up -d
# PostgreSQL 16 on localhost:5432
# Redis 7 on localhost:6379
```

## 3. Environment Setup

```bash
# apps/api/.env
cp apps/api/.env.example apps/api/.env
```

Required environment variables:
```
DATABASE_URL=postgresql://markflow:markflow@localhost:5432/markflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:3000
```

## 4. Run Migrations

```bash
pnpm --filter @markflow/db db:migrate
```

## 5. Start Development

```bash
# All services (Turbo parallel)
pnpm dev

# Or individually:
pnpm --filter @markflow/api dev      # API server (localhost:4000)
pnpm --filter @markflow/web dev      # Next.js KMS (localhost:3000)
pnpm --filter @markflow/editor dev   # Editor watch build
```

## 6. Verify

1. Open `http://localhost:3000`
2. Register a new account (email verification logged to console in Phase 1)
3. Copy the verification link from console → paste in browser
4. Login → Root workspace "My Notes" should be visible
5. Create a document → edit → verify auto-save

## 7. Run Tests

```bash
# All tests
pnpm test

# API integration tests (requires running PostgreSQL)
pnpm --filter @markflow/api test

# Web unit tests
pnpm --filter @markflow/web test

# E2E (requires all services running)
pnpm --filter @markflow/web test:e2e
```

## Project Layout

```
packages/db      → Drizzle schema + migrations (shared)
apps/api         → Fastify REST API (port 4000)
apps/web         → Next.js KMS frontend (port 3000)
packages/editor  → @markflow/editor (npm package, unchanged)
```
