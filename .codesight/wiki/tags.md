# Tags

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Tags subsystem handles **3 routes** and touches: auth.

## Routes

- `GET` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth]
  `apps/api/src/routes/tags.ts`
- `PUT` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth]
  `apps/api/src/routes/tags.ts`
- `GET` `/workspaces/:wsId/tags` params(wsId) [auth]
  `apps/api/src/routes/tags.ts`

## Related Models

- **tags** (3 fields) → [database.md](./database.md)
- **document_tags** (2 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/tags.ts`

---
_Back to [overview.md](./overview.md)_