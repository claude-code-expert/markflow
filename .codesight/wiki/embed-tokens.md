# Embed-tokens

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Embed-tokens subsystem handles **3 routes** and touches: auth.

## Routes

- `POST` `/workspaces/:id/embed-tokens` params(id) [auth]
  `apps/api/src/routes/embed-tokens.ts`
- `GET` `/workspaces/:id/embed-tokens` params(id) [auth]
  `apps/api/src/routes/embed-tokens.ts`
- `DELETE` `/workspaces/:id/embed-tokens/:tokenId` params(id, tokenId) [auth]
  `apps/api/src/routes/embed-tokens.ts`

## Related Models

- **embed_tokens** (8 fields) → [database.md](./database.md)
- **refresh_tokens** (4 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/embed-tokens.ts`

---
_Back to [overview.md](./overview.md)_