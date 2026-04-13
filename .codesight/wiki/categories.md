# Categories

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Categories subsystem handles **6 routes** and touches: auth.

## Routes

- `POST` `/workspaces/:wsId/categories` params(wsId) [auth]
  `apps/api/src/routes/categories.ts`
- `GET` `/workspaces/:wsId/categories` params(wsId) [auth]
  `apps/api/src/routes/categories.ts`
- `GET` `/workspaces/:wsId/categories/tree` params(wsId) [auth]
  `apps/api/src/routes/categories.ts`
- `PATCH` `/workspaces/:wsId/categories/:id` params(wsId, id) [auth]
  `apps/api/src/routes/categories.ts`
- `PUT` `/workspaces/:wsId/categories/reorder` params(wsId) [auth]
  `apps/api/src/routes/categories.ts`
- `DELETE` `/workspaces/:wsId/categories/:id` params(wsId, id) [auth]
  `apps/api/src/routes/categories.ts`

## Related Models

- **categories** (5 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/categories.ts`

---
_Back to [overview.md](./overview.md)_