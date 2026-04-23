# Config

## Environment Variables

- `CI` **required** — apps/web/playwright.config.ts
- `CORS_ORIGIN` (has default) — .env.local
- `CRON_SECRET` **required** — apps/web/app/api/cron/cleanup-trash/route.ts
- `DATABASE_URL` (has default) — .env.local
- `E2E_BASE_URL` **required** — apps/web/playwright.config.ts
- `E2E_USER_EMAIL` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_USER_PASSWORD` **required** — apps/web/tests/e2e/document-management.spec.ts
- `E2E_WORKSPACE_NAME` **required** — apps/web/tests/e2e/team-management.spec.ts
- `E2E_WORKSPACE_SLUG` **required** — apps/web/tests/e2e/document-management.spec.ts
- `EMAIL_FROM` (has default) — .env.local
- `FRONTEND_URL` (has default) — .env.local
- `HOST` (has default) — .env.local
- `JWT_REFRESH_SECRET` (has default) — .env.local
- `JWT_SECRET` (has default) — .env.local
- `NEXT_PUBLIC_R2_WORKER_URL` **required** — apps/web/lib/image-upload.ts
- `NEXT_PUBLIC_SITE_URL` **required** — apps/web/app/layout.tsx
- `NODE_ENV` (has default) — .env.local
- `PGHOST` (has default) — .env.local
- `PORT` (has default) — .env.local
- `R2_UPLOAD_SECRET` **required** — apps/web/app/api/v1/upload-token/route.ts
- `RESEND_API_KEY` **required** — apps/web/lib/server/utils/email.ts

## Config Files

- `apps/web/next.config.ts`
- `packages/db/drizzle.config.ts`
- `tsconfig.json`
