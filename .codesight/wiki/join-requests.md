# Join-requests

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Join-requests subsystem handles **4 routes** and touches: auth.

## Routes

- `POST` `/workspaces/:id/join-requests` params(id) [auth]
  `apps/api/src/routes/join-requests.ts`
- `GET` `/workspaces/:id/join-requests` params(id) [auth]
  `apps/api/src/routes/join-requests.ts`
- `PATCH` `/workspaces/:id/join-requests/batch` params(id) [auth]
  `apps/api/src/routes/join-requests.ts`
- `PATCH` `/workspaces/:id/join-requests/:requestId` params(id, requestId) [auth]
  `apps/api/src/routes/join-requests.ts`

## Related Models

- **join_requests** (7 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/api/src/routes/join-requests.ts`

---
_Back to [overview.md](./overview.md)_