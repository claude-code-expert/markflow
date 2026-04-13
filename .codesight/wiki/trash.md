# Trash

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Trash subsystem handles **3 routes** and touches: auth.

## Routes

- `GET` `/workspaces/:wsId/trash` params(wsId) [auth]
  `apps/api/src/routes/trash.ts`
- `POST` `/workspaces/:wsId/trash/:docId/restore` params(wsId, docId) [auth]
  `apps/api/src/routes/trash.ts`
- `DELETE` `/workspaces/:wsId/trash/:docId` params(wsId, docId) [auth]
  `apps/api/src/routes/trash.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/trash.ts`

---
_Back to [overview.md](./overview.md)_