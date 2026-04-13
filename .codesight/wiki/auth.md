# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **9 routes** and touches: auth, email, db.

## Routes

- `POST` `/register` [auth, email]
  `apps/api/src/routes/auth.ts`
- `GET` `/verify-email` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/resend-verification` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/login` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/refresh` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/forgot-password` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/reset-password` [auth, email]
  `apps/api/src/routes/auth.ts`
- `POST` `/logout` [auth, email]
  `apps/api/src/routes/auth.ts`
- `PUT` `/me/password` [auth, db]
  `apps/api/src/routes/users.ts`

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
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/users.ts`

---
_Back to [overview.md](./overview.md)_