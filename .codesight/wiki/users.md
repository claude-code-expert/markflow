# Users

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Users subsystem handles **2 routes** and touches: auth, db.

## Routes

- `GET` `/me` [auth, db]
  `apps/api/src/routes/users.ts`
- `PATCH` `/me` [auth, db]
  `apps/api/src/routes/users.ts`

## Related Models

- **users** (12 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/users.ts`

---
_Back to [overview.md](./overview.md)_