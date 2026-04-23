# markflow — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**markflow** is a typescript project built with next-app, using drizzle for data persistence, organized as a monorepo.

**Workspaces:** `@markflow/db` (`packages/db`), `@markflow/editor` (`packages/editor`), `@markflow/web` (`apps/web`), `markflow-r2-uploader` (`apps/worker`)

## Scale

64 API routes · 15 database models · 85 UI components · 39 library files · 4 middleware layers · 21 environment variables

## Subsystems

- **[Auth](./auth.md)** — 9 routes — touches: auth, db, email
- **[Route](./route.md)** — 55 routes — touches: auth, db, upload

**Database:** drizzle, 15 models — see [database.md](./database.md)

**UI:** 85 components (react) — see [ui.md](./ui.md)

**Libraries:** 39 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `apps/web/lib/server/db.ts` — imported by **48** files
- `apps/web/lib/server/middleware.ts` — imported by **47** files
- `apps/web/lib/server/utils/errors.ts` — imported by **42** files
- `apps/web/lib/api.ts` — imported by **39** files
- `apps/web/stores/toast-store.ts` — imported by **20** files
- `apps/web/stores/workspace-store.ts` — imported by **19** files

## Required Environment Variables

- `CI` — `apps/web/playwright.config.ts`
- `CRON_SECRET` — `apps/web/app/api/cron/cleanup-trash/route.ts`
- `E2E_BASE_URL` — `apps/web/playwright.config.ts`
- `E2E_USER_EMAIL` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_USER_PASSWORD` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_WORKSPACE_NAME` — `apps/web/tests/e2e/team-management.spec.ts`
- `E2E_WORKSPACE_SLUG` — `apps/web/tests/e2e/document-management.spec.ts`
- `NEXT_PUBLIC_R2_WORKER_URL` — `apps/web/lib/image-upload.ts`
- `NEXT_PUBLIC_SITE_URL` — `apps/web/app/layout.tsx`
- `R2_UPLOAD_SECRET` — `apps/web/app/api/v1/upload-token/route.ts`
- `RESEND_API_KEY` — `apps/web/lib/server/utils/email.ts`

---
_Back to [index.md](./index.md) · Generated 2026-04-23_