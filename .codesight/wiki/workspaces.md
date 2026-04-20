# Workspaces

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Workspaces subsystem handles **52 routes** and touches: auth, db, cache, queue, email, payment.

## Routes

- `GET` `/workspaces/public` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces` [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:id` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:id` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:id` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:id/transfer` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:id/members` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:id/members/:userId` params(id, userId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:id/members/:userId` params(id, userId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:id/invitations` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:id/join-requests` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:id/join-requests` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:id/join-requests/batch` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:id/join-requests/:requestId` params(id, requestId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/categories` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/categories` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/categories/tree` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:wsId/categories/:id` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PUT` `/workspaces/:wsId/categories/reorder` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/categories/:id/ancestors` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/categories/:id/descendants` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:wsId/categories/:id` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/documents` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:wsId/documents/:id` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/trash` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/trash/:docId/restore` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:wsId/trash/:docId` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:docId/versions` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/documents/:docId/restore-version` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PUT` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/graph` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/graph/documents/:id/context` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PUT` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/tags` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/import` params(wsId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:docId/export` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/categories/:catId/export` params(wsId, catId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:id/theme` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:id/theme` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:id/embed-tokens` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:id/embed-tokens` params(id) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:id/embed-tokens/:tokenId` params(id, tokenId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `GET` `/workspaces/:wsId/documents/:docId/comments` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `POST` `/workspaces/:wsId/documents/:docId/comments` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `PATCH` `/workspaces/:wsId/documents/:docId/comments/:commentId` params(wsId, docId, commentId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`
- `DELETE` `/workspaces/:wsId/documents/:docId/comments/:commentId` params(wsId, docId, commentId) [auth, db, cache, queue, email, payment, upload]
  `api/index.mjs`

## Related Models

- **workspaces** (7 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `api/index.mjs`

---
_Back to [overview.md](./overview.md)_