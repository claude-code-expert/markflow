# Relations

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Relations subsystem handles **2 routes** and touches: auth.

## Routes

- `PUT` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth]
  `apps/api/src/routes/relations.ts`
- `GET` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth]
  `apps/api/src/routes/relations.ts`

## Related Models

- **document_relations** (4 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/relations.ts`

---
_Back to [overview.md](./overview.md)_