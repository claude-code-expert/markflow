# Workspaces

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Workspaces subsystem handles **10 routes** and touches: auth, db.

## Routes

- `GET` `/workspaces/public` [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `POST` `/workspaces` [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `GET` `/workspaces` [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `GET` `/workspaces/:id` params(id) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `PATCH` `/workspaces/:id` params(id) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `DELETE` `/workspaces/:id` params(id) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `POST` `/workspaces/:id/transfer` params(id) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `GET` `/workspaces/:id/members` params(id) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `PATCH` `/workspaces/:id/members/:userId` params(id, userId) [auth, db]
  `apps/api/src/routes/workspaces.ts`
- `DELETE` `/workspaces/:id/members/:userId` params(id, userId) [auth, db]
  `apps/api/src/routes/workspaces.ts`

## Related Models

- **workspaces** (7 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/workspaces.ts`

---
_Back to [overview.md](./overview.md)_