# Versions

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Versions subsystem handles **2 routes** and touches: auth.

## Routes

- `GET` `/workspaces/:wsId/documents/:docId/versions` params(wsId, docId) [auth]
  `apps/api/src/routes/versions.ts`
- `POST` `/workspaces/:wsId/documents/:docId/restore-version` params(wsId, docId) [auth]
  `apps/api/src/routes/versions.ts`

## Related Models

- **document_versions** (5 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/versions.ts`

---
_Back to [overview.md](./overview.md)_