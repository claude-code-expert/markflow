# markflow — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**markflow** is a typescript project built with fastify, next-app, using drizzle for data persistence, organized as a monorepo.

**Workspaces:** `@markflow/db` (`packages/db`), `@markflow/editor` (`packages/editor`), `@markflow/api` (`apps/api`), `@markflow/demo` (`apps/demo`), `@markflow/web` (`apps/web`), `markflow-r2-uploader` (`apps/worker`)

## Scale

68 API routes · 15 database models · 82 UI components · 45 library files · 16 middleware layers · 22 environment variables

## Subsystems

- **[Auth](./auth.md)** — 9 routes — touches: auth, email, db
- **[Categories](./categories.md)** — 8 routes — touches: auth
- **[Comments](./comments.md)** — 4 routes — touches: auth, db
- **[Documents](./documents.md)** — 5 routes — touches: auth, db
- **[Embed-tokens](./embed-tokens.md)** — 3 routes — touches: auth
- **[Graph](./graph.md)** — 2 routes — touches: auth
- **[Import-export](./import-export.md)** — 3 routes — touches: auth, upload
- **[Invitations](./invitations.md)** — 3 routes — touches: auth
- **[Join-requests](./join-requests.md)** — 4 routes — touches: auth
- **[Markflow-pdf-export](./markflow-pdf-export.md)** — 1 routes — touches: db
- **[Relations](./relations.md)** — 2 routes — touches: auth
- **[Tags](./tags.md)** — 3 routes — touches: auth
- **[Theme](./theme.md)** — 2 routes — touches: auth
- **[Trash](./trash.md)** — 3 routes — touches: auth
- **[Users](./users.md)** — 2 routes — touches: auth, db
- **[Versions](./versions.md)** — 2 routes — touches: auth
- **[Workspaces](./workspaces.md)** — 10 routes — touches: auth, db
- **[Infra](./infra.md)** — 2 routes — touches: auth, upload

**Database:** drizzle, 15 models — see [database.md](./database.md)

**UI:** 82 components (react) — see [ui.md](./ui.md)

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

- `CI` — `apps/web/playwright.config.ts`
- `E2E_BASE_URL` — `apps/web/playwright.config.ts`
- `E2E_USER_EMAIL` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_USER_PASSWORD` — `apps/web/tests/e2e/document-management.spec.ts`
- `E2E_WORKSPACE_NAME` — `apps/web/tests/e2e/team-management.spec.ts`
- `E2E_WORKSPACE_SLUG` — `apps/web/tests/e2e/document-management.spec.ts`
- `NEXT_PUBLIC_API_URL` — `apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx`
- `NEXT_PUBLIC_R2_WORKER_URL` — `apps/web/lib/image-upload.ts`
- `NEXT_PUBLIC_SITE_URL` — `apps/web/app/layout.tsx`
- `R2_UPLOAD_SECRET` — `apps/api/src/routes/upload-token.ts`
- `RESEND_API_KEY` — `apps/api/src/utils/email.ts`
- `TEST_DATABASE_URL` — `apps/api/tests/helpers/setup.ts`
- _...1 more_

---
_Back to [index.md](./index.md) · Generated 2026-04-16_