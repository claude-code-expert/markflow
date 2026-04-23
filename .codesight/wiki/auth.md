# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **9 routes** and touches: auth, db, email.

## Routes

- `POST` `/api/v1/auth/forgot-password` [auth]
  `apps/web/app/api/v1/auth/forgot-password/route.ts`
- `POST` `/api/v1/auth/login` → out: { accessToken, user } [auth]
  `apps/web/app/api/v1/auth/login/route.ts`
- `POST` `/api/v1/auth/logout` [auth, db]
  `apps/web/app/api/v1/auth/logout/route.ts`
- `POST` `/api/v1/auth/refresh` [auth]
  `apps/web/app/api/v1/auth/refresh/route.ts`
- `POST` `/api/v1/auth/register` [auth]
  `apps/web/app/api/v1/auth/register/route.ts`
- `POST` `/api/v1/auth/resend-verification` [auth, email]
  `apps/web/app/api/v1/auth/resend-verification/route.ts`
- `POST` `/api/v1/auth/reset-password` [auth]
  `apps/web/app/api/v1/auth/reset-password/route.ts`
- `GET` `/api/v1/auth/verify-email` [auth]
  `apps/web/app/api/v1/auth/verify-email/route.ts`
- `PUT` `/api/v1/users/me/password` → out: { accessToken, refreshToken } [auth]
  `apps/web/app/api/v1/users/me/password/route.ts`

## Middleware

- **middleware** (auth) — `apps/web/lib/server/middleware.ts`
- **auth-service** (auth) — `apps/web/lib/server/services/auth-service.ts`
- **auth-store** (auth) — `apps/web/stores/auth-store.ts`
- **auth-workspace-flow.spec** (auth) — `apps/web/tests/e2e/auth-workspace-flow.spec.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/web/app/api/v1/auth/forgot-password/route.ts`
- `apps/web/app/api/v1/auth/login/route.ts`
- `apps/web/app/api/v1/auth/logout/route.ts`
- `apps/web/app/api/v1/auth/refresh/route.ts`
- `apps/web/app/api/v1/auth/register/route.ts`
- `apps/web/app/api/v1/auth/resend-verification/route.ts`
- `apps/web/app/api/v1/auth/reset-password/route.ts`
- `apps/web/app/api/v1/auth/verify-email/route.ts`
- `apps/web/app/api/v1/users/me/password/route.ts`

---
_Back to [overview.md](./overview.md)_