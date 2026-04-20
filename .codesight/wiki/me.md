# Me

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Me subsystem handles **2 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `GET` `/me` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/me` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_