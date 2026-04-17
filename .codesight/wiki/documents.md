# Documents

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Documents subsystem handles **5 routes** and touches: auth, db.

## Routes

- `POST` `/workspaces/:wsId/documents` params(wsId) [auth, db]
  `apps/api/src/routes/documents.ts`
- `GET` `/workspaces/:wsId/documents` params(wsId) [auth, db]
  `apps/api/src/routes/documents.ts`
- `GET` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db]
  `apps/api/src/routes/documents.ts`
- `PATCH` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db]
  `apps/api/src/routes/documents.ts`
- `DELETE` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db]
  `apps/api/src/routes/documents.ts`

## Related Models

- **documents** (9 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/documents.ts`

---
_Back to [overview.md](./overview.md)_