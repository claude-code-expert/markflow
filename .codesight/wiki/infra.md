# Infra

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Infra subsystem handles **2 routes** and touches: auth.

## Routes

- `GET` `/health` [auth, upload]
  `apps/api/src/index.ts`
- `GET` `/` [auth, upload]
  `apps/api/src/routes/upload-token.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/index.ts`
- `apps/api/src/routes/upload-token.ts`

---
_Back to [overview.md](./overview.md)_