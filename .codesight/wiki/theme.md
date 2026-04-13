# Theme

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Theme subsystem handles **2 routes** and touches: auth.

## Routes

- `GET` `/workspaces/:id/theme` params(id) [auth]
  `apps/api/src/routes/theme.ts`
- `PATCH` `/workspaces/:id/theme` params(id) [auth]
  `apps/api/src/routes/theme.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/theme.ts`

---
_Back to [overview.md](./overview.md)_