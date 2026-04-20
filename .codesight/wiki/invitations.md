# Invitations

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Invitations subsystem handles **2 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `GET` `/invitations/:token` params(token) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/invitations/:token/accept` params(token) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`

## Related Models

- **invitations** (8 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_