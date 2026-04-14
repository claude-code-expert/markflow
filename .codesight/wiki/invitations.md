# Invitations

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Invitations subsystem handles **3 routes** and touches: auth.

## Routes

- `POST` `/workspaces/:id/invitations` params(id) [auth]
  `apps/api/src/routes/invitations.ts`
- `GET` `/invitations/:token` params(token) [auth]
  `apps/api/src/routes/invitations.ts`
- `POST` `/invitations/:token/accept` params(token) [auth]
  `apps/api/src/routes/invitations.ts`

## Related Models

- **invitations** (8 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/invitations.ts`

---
_Back to [overview.md](./overview.md)_