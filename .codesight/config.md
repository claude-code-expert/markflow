# Config

## Environment Variables

- `CI` **required** — apps/web/playwright.config.ts
- `CORS_ORIGIN` (has default) — .env.local
- `DATABASE_URL` (has default) — .env.local
- `E2E_BASE_URL` **required** — apps/web/playwright.config.ts
- `E2E_USER_EMAIL` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_USER_PASSWORD` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_WORKSPACE_NAME` **required** — apps/web/tests/e2e/team-management.spec.ts
- `E2E_WORKSPACE_SLUG` **required** — apps/web/tests/e2e/document-management.spec.ts
- `EMAIL_FROM` **required** — apps/api/src/utils/email.ts
- `FRONTEND_URL` **required** — apps/api/src/utils/email.ts
- `HOST` (has default) — .env.local
- `JWT_REFRESH_SECRET` (has default) — .env.local
- `JWT_SECRET` (has default) — .env.local
- `NEXT_PUBLIC_API_URL` **required** — apps/web/app/(app)/[workspaceSlug]/doc/[docId]/layout.tsx
- `NEXT_PUBLIC_R2_WORKER_URL` **required** — apps/web/lib/image-upload.ts
- `NEXT_PUBLIC_SITE_URL` **required** — apps/web/app/layout.tsx
- `NODE_ENV` **required** — apps/api/src/routes/auth.ts
- `PORT` (has default) — .env.local
- `R2_UPLOAD_SECRET` **required** — apps/api/src/routes/upload-token.ts
- `RESEND_API_KEY` (has default) — .env.local
- `TEST_DATABASE_URL` (has default) — .env.local
- `VITEST` **required** — apps/api/src/index.ts

## Config Files

- `apps/demo/next.config.ts`
- `apps/web/next.config.ts`
- `packages/db/drizzle.config.ts`
- `tsconfig.json`
