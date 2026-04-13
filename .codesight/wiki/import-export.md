# Import-export

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Import-export subsystem handles **3 routes** and touches: auth.

## Routes

- `POST` `/workspaces/:wsId/import` params(wsId) [auth, upload]
  `apps/api/src/routes/import-export.ts`
- `GET` `/workspaces/:wsId/documents/:docId/export` params(wsId, docId) [auth, upload]
  `apps/api/src/routes/import-export.ts`
- `GET` `/workspaces/:wsId/categories/:catId/export` params(wsId, catId) [auth, upload]
  `apps/api/src/routes/import-export.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/import-export.ts`

---
_Back to [overview.md](./overview.md)_