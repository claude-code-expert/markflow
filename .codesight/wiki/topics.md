# Topics

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Topics subsystem handles **2 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `POST` `/topics` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/topics` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_