# markflow — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**markflow** is a typescript project built with fastify, next-app, using drizzle for data persistence, organized as a monorepo.

**Workspaces:** `@markflow/db` (`packages/db`), `@markflow/editor` (`packages/editor`), `@markflow/api` (`apps/api`), `@markflow/demo` (`apps/demo`), `@markflow/web` (`apps/web`), `markflow-r2-uploader` (`apps/worker`)

## Scale

88 API routes · 15 database models · 87 UI components · 45 library files · 16 middleware layers · 37 environment variables

## Subsystems

- **[Auth](./auth.md)** — 5 routes — touches: auth, db, cache, queue, email
- **[Payments](./payments.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Api-keys](./api-keys.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Broadcasts](./broadcasts.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Close](./close.md)** — 1 routes
- **[Connect](./connect.md)** — 1 routes
- **[Contact-properties](./contact-properties.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Contacts](./contacts.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Data](./data.md)** — 1 routes
- **[Domains](./domains.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Drain](./drain.md)** — 1 routes
- **[Emails](./emails.md)** — 2 routes — touches: auth, db, cache, queue, email
- **[Error](./error.md)** — 1 routes
- **[Forgot-password](./forgot-password.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Invitations](./invitations.md)** — 2 routes — touches: auth, db, cache, queue, email
- **[Markflow-pdf-export](./markflow-pdf-export.md)** — 1 routes — touches: db
- **[Me](./me.md)** — 2 routes — touches: auth, db, cache, queue, email
- **[Resend-verification](./resend-verification.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Reset-password](./reset-password.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[SecureConnect](./secureconnect.md)** — 1 routes
- **[Segments](./segments.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Start](./start.md)** — 1 routes
- **[Templates](./templates.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Timeout](./timeout.md)** — 1 routes
- **[Topics](./topics.md)** — 2 routes — touches: auth, db, cache, queue, email
- **[Verify-email](./verify-email.md)** — 1 routes — touches: auth, db, cache, queue, email
- **[Workspaces](./workspaces.md)** — 52 routes — touches: auth, db, cache, queue, email
- **[Infra](./infra.md)** — 2 routes — touches: auth, db, cache, queue, email

**Database:** drizzle, 15 models — see [database.md](./database.md)

**UI:** 87 components (react) — see [ui.md](./ui.md)

**Libraries:** 45 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `apps/web/lib/api.ts` — imported by **39** files
- `apps/api/tests/helpers/setup.ts` — imported by **34** files
- `apps/api/src/utils/errors.ts` — imported by **33** files
- `apps/api/tests/helpers/factory.ts` — imported by **33** files
- `apps/web/stores/toast-store.ts` — imported by **20** files
- `apps/web/stores/workspace-store.ts` — imported by **19** files

## Required Environment Variables

- `__MINIMATCH_TESTING_PLATFORM__` — `api/index.mjs`
- `CI` — `apps/web/playwright.config.ts`
- `E2E_BASE_URL` — `apps/web/playwright.config.ts`
- `E2E_USER_EMAIL` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_USER_PASSWORD` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_WORKSPACE_NAME` — `apps/web/tests/e2e/team-management.spec.ts`
- `E2E_WORKSPACE_SLUG` — `apps/web/tests/e2e/document-management.spec.ts`
- `GRACEFUL_FS_PLATFORM` — `api/index.mjs`
- `LOGNAME` — `api/index.mjs`
- `NEXT_PUBLIC_API_URL` — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx`
- `NEXT_PUBLIC_R2_WORKER_URL` — `apps/web/lib/image-upload.ts`
- `NEXT_PUBLIC_SITE_URL` — `apps/web/app/layout.tsx`
- _...14 more_

---
_Back to [index.md](./index.md) · Generated 2026-04-20_