# Graph

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Graph subsystem handles **2 routes** and touches: auth.

## Routes

- `GET` `/workspaces/:wsId/graph` params(wsId) [auth]
  `apps/api/src/routes/graph.ts`
- `GET` `/workspaces/:wsId/graph/documents/:id/context` params(wsId, id) [auth]
  `apps/api/src/routes/graph.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/graph.ts`

---
_Back to [overview.md](./overview.md)_