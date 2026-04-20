# Config

## Environment Variables

- `__MINIMATCH_TESTING_PLATFORM__` **required** — api/index.mjs
- `CI` **required** — apps/web/playwright.config.ts
- `CORS_ORIGIN` (has default) — .env.local
- `DATABASE_URL` (has default) — .env.local
- `DATABASE_URL_UNPOOLED` (has default) — .env.local
- `E2E_BASE_URL` **required** — apps/web/playwright.config.ts
- `E2E_USER_EMAIL` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_USER_PASSWORD` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_WORKSPACE_NAME` **required** — apps/web/tests/e2e/team-management.spec.ts
- `E2E_WORKSPACE_SLUG` **required** — apps/web/tests/e2e/document-management.spec.ts
- `EMAIL_FROM` (has default) — .env.local
- `FRONTEND_URL` (has default) — .env.local
- `GRACEFUL_FS_PLATFORM` **required** — api/index.mjs
- `HOST` (has default) — .env.local
- `JWT_REFRESH_SECRET` (has default) — .env.local
- `JWT_SECRET` (has default) — .env.local
- `LOGNAME` **required** — api/index.mjs
- `NEXT_PUBLIC_API_URL` **required** — apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx
- `NEXT_PUBLIC_R2_WORKER_URL` **required** — apps/web/lib/image-upload.ts
- `NEXT_PUBLIC_SITE_URL` **required** — apps/web/app/layout.tsx
- `NODE_DEBUG` **required** — api/index.mjs
- `NODE_ENV` (has default) — .env.local
- `NODE_OPTIONS` **required** — api/index.mjs
- `NODE_V8_COVERAGE` **required** — api/index.mjs
- `PGHOST` (has default) — .env.local
- `PORT` (has default) — .env.local
- `R2_UPLOAD_SECRET` **required** — api/index.mjs
- `READABLE_STREAM` **required** — api/index.mjs
- `RESEND_API_KEY` **required** — api/index.mjs
- `RESEND_BASE_URL` **required** — api/index.mjs
- `RESEND_USER_AGENT` **required** — api/index.mjs
- `TEST_DATABASE_URL` **required** — apps/api/tests/helpers/setup.ts
- `TEST_GRACEFUL_FS_GLOBAL_PATCH` **required** — api/index.mjs
- `USER` **required** — api/index.mjs
- `USERNAME` **required** — api/index.mjs
- `VERCEL` **required** — api/index.mjs
- `VITEST` **required** — api/index.mjs

## Config Files

- `apps/demo/next.config.ts`
- `apps/web/next.config.ts`
- `packages/db/drizzle.config.ts`
- `tsconfig.json`
- `vercel.json`
