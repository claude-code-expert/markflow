# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **5 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `POST` `/register` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/login` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/refresh` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/logout` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PUT` `/me/password` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`

## Middleware

- **auth** (auth) — `apps/api/src/middleware/auth.ts`
- **workspace-scope** (auth) — `apps/api/src/middleware/workspace-scope.ts`
- **auth** (auth) — `apps/api/src/routes/auth.ts`
- **auth-service** (auth) — `apps/api/src/services/auth-service.ts`
- **auth-forgot-password.test** (auth) — `apps/api/tests/integration/auth-forgot-password.test.ts`
- **auth-login.test** (auth) — `apps/api/tests/integration/auth-login.test.ts`
- **auth-refresh.test** (auth) — `apps/api/tests/integration/auth-refresh.test.ts`
- **auth-register.test** (auth) — `apps/api/tests/integration/auth-register.test.ts`
- **auth-resend-verification.test** (auth) — `apps/api/tests/integration/auth-resend-verification.test.ts`
- **auth-reset-password.test** (auth) — `apps/api/tests/integration/auth-reset-password.test.ts`
- **auth-verify.test** (auth) — `apps/api/tests/integration/auth-verify.test.ts`
- **auth-store** (auth) — `apps/web/stores/auth-store.ts`
- **auth-workspace-flow.spec** (auth) — `apps/web/tests/e2e/auth-workspace-flow.spec.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_