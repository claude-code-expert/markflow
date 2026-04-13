# Routes

## CRUD Resources

- **`/workspaces/:wsId/categories`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Categorie
- **`/workspaces/:wsId/documents/:docId/comments`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Comment
- **`/workspaces/:wsId/documents`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Document
- **`/workspaces/:id/embed-tokens`** GET | POST | GET/:id | DELETE/:id → Embed-token
- **`/workspaces/:id/join-requests`** GET | POST | GET/:id | PATCH/:id → Join-request
- **`/workspaces`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Workspace
- **`/workspaces/:id/members`** GET | GET/:id | PATCH/:id | DELETE/:id → Member

## Other Routes

- `GET` `/health` params() [auth, upload]
- `POST` `/register` params() [auth, email] ✓
- `GET` `/verify-email` params() [auth, email]
- `POST` `/resend-verification` params() [auth, email]
- `POST` `/login` params() [auth, email] ✓
- `POST` `/refresh` params() [auth, email]
- `POST` `/forgot-password` params() [auth, email]
- `POST` `/reset-password` params() [auth, email]
- `POST` `/logout` params() [auth, email]
- `GET` `/workspaces/:wsId/categories/tree` params(wsId) [auth] ✓
- `PUT` `/workspaces/:wsId/categories/reorder` params(wsId) [auth] ✓
- `GET` `/workspaces/:wsId/graph` params(wsId) [auth] ✓
- `POST` `/workspaces/:wsId/import` params(wsId) [auth, upload]
- `GET` `/workspaces/:wsId/documents/:docId/export` params(wsId, docId) [auth, upload]
- `GET` `/workspaces/:wsId/categories/:catId/export` params(wsId, catId) [auth, upload]
- `POST` `/workspaces/:id/invitations` params(id) [auth] ✓
- `GET` `/invitations/:token` params(token) [auth] ✓
- `POST` `/invitations/:token/accept` params(token) [auth] ✓
- `PATCH` `/workspaces/:id/join-requests/batch` params(id) [auth] ✓
- `PUT` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/documents/:docId/relations` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth] ✓
- `PUT` `/workspaces/:wsId/documents/:docId/tags` params(wsId, docId) [auth] ✓
- `GET` `/workspaces/:wsId/tags` params(wsId) [auth] ✓
- `GET` `/workspaces/:id/theme` params(id) [auth] ✓
- `PATCH` `/workspaces/:id/theme` params(id) [auth] ✓
- `GET` `/workspaces/:wsId/trash` params(wsId) [auth] ✓
- `POST` `/workspaces/:wsId/trash/:docId/restore` params(wsId, docId) [auth] ✓
- `DELETE` `/workspaces/:wsId/trash/:docId` params(wsId, docId) [auth] ✓
- `GET` `/` params() [auth, upload] ✓
- `GET` `/me` params() [auth, db]
- `PATCH` `/me` params() [auth, db]
- `PUT` `/me/password` params() [auth, db]
- `GET` `/workspaces/:wsId/documents/:docId/versions` params(wsId, docId) [auth]
- `POST` `/workspaces/:wsId/documents/:docId/restore-version` params(wsId, docId) [auth]
- `GET` `/workspaces/public` params() [auth, db] ✓
- `POST` `/workspaces/:id/transfer` params(id) [auth, db] ✓
