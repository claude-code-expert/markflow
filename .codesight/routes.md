# Routes

## CRUD Resources

- **`/workspaces`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Workspace
- **`/workspaces/:id/members`** GET | GET/:id | PATCH/:id | DELETE/:id → Member
- **`/workspaces/:id/join-requests`** GET | POST | GET/:id | PATCH/:id → Join-request
- **`/workspaces/:wsId/categories`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Categorie
- **`/workspaces/:wsId/documents`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Document
- **`/workspaces/:id/embed-tokens`** GET | POST | GET/:id | DELETE/:id → Embed-token
- **`/workspaces/:wsId/documents/:docId/comments`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Comment

## Other Routes

- `POST` `/api-keys` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/emails/batch` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/broadcasts` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/contact-properties` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/contacts` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/domains` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/emails` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/segments` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/templates` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/topics` params() [auth, db, cache, queue, email, payment, upload]
- `GET` `/topics` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/webhooks` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/register` params() [auth, db, cache, queue, email, payment, upload] ✓
- `GET` `/verify-email` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/resend-verification` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/login` params() [auth, db, cache, queue, email, payment, upload] ✓
- `POST` `/refresh` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/forgot-password` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/reset-password` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/logout` params() [auth, db, cache, queue, email, payment, upload]
- `GET` `/me` params() [auth, db, cache, queue, email, payment, upload]
- `PATCH` `/me` params() [auth, db, cache, queue, email, payment, upload]
- `PUT` `/me/password` params() [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/public` params() [auth, db, cache, queue, email, payment, upload]
- `POST` `/workspaces/:id/transfer` params(id) [auth, db, cache, queue, email, payment, upload]
- `POST` `/workspaces/:id/invitations` params(id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/invitations/:token` params(token) [auth, db, cache, queue, email, payment, upload]
- `POST` `/invitations/:token/accept` params(token) [auth, db, cache, queue, email, payment, upload]
- `PATCH` `/workspaces/:id/join-requests/batch` params(id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/categories/tree` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `PUT` `/workspaces/:wsId/categories/reorder` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/categories/:id/ancestors` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/categories/:id/descendants` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/trash` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `POST` `/workspaces/:wsId/trash/:docId/restore` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `DELETE` `/workspaces/:wsId/trash/:docId` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/documents/:docId/versions` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `POST` `/workspaces/:wsId/documents/:docId/restore-version` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `PUT` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/graph` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/graph/documents/:id/context` params(wsId, id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `PUT` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/tags` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `POST` `/workspaces/:wsId/import` params(wsId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/documents/:docId/export` params(wsId, docId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:wsId/categories/:catId/export` params(wsId, catId) [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:id/theme` params(id) [auth, db, cache, queue, email, payment, upload]
- `PATCH` `/workspaces/:id/theme` params(id) [auth, db, cache, queue, email, payment, upload]
- `GET` `/` params() [auth, db, cache, queue, email, payment, upload] ✓
- `GET` `/health` params() [auth, db, cache, queue, email, payment, upload]
- `GET` `/workspaces/:workspaceId/export` params(workspaceId) [db]

## WebSocket Events

- `WS` `close` — `api/index.mjs`
- `WS` `timeout` — `api/index.mjs`
- `WS` `start` — `api/index.mjs`
- `WS` `secureConnect` — `api/index.mjs`
- `WS` `error` — `api/index.mjs`
- `WS` `drain` — `api/index.mjs`
- `WS` `connect` — `api/index.mjs`
- `WS` `data` — `api/index.mjs`
