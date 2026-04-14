# Comments

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Comments subsystem handles **4 routes** and touches: auth, db.

## Routes

- `GET` `/workspaces/:wsId/documents/:docId/comments` params(wsId, docId) [auth, db]
  `apps/api/src/routes/comments.ts`
- `POST` `/workspaces/:wsId/documents/:docId/comments` params(wsId, docId) [auth, db]
  `apps/api/src/routes/comments.ts`
- `PATCH` `/workspaces/:wsId/documents/:docId/comments/:commentId` params(wsId, docId, commentId) [auth, db]
  `apps/api/src/routes/comments.ts`
- `DELETE` `/workspaces/:wsId/documents/:docId/comments/:commentId` params(wsId, docId, commentId) [auth, db]
  `apps/api/src/routes/comments.ts`

## Related Models

- **comments** (7 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/comments.ts`

---
_Back to [overview.md](./overview.md)_