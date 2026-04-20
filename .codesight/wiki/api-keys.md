# Api-keys

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Api-keys subsystem handles **1 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `POST` `/api-keys` [auth, db, cache, queue, email, payment, upload] → middleware: payload → options
  `api/index.mjs`

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_