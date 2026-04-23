# Routes

## CRUD Resources

- **`/api/v1/workspaces/[id]/documents/[docId]`** GET | PATCH/:id | DELETE/:id → [docId]
- **`/api/v1/workspaces/[id]`** GET | PATCH/:id | DELETE/:id → [id]

## Other Routes

- `GET` `/api/cron/cleanup-trash` → out: { error } [auth, db]
- `POST` `/api/v1/auth/forgot-password` [auth]
- `POST` `/api/v1/auth/login` → out: { accessToken, user } [auth]
- `POST` `/api/v1/auth/logout` [auth, db]
- `POST` `/api/v1/auth/refresh` [auth]
- `POST` `/api/v1/auth/register` [auth]
- `POST` `/api/v1/auth/resend-verification` [auth, email]
- `POST` `/api/v1/auth/reset-password` [auth]
- `GET` `/api/v1/auth/verify-email` [auth]
- `POST` `/api/v1/invitations/[token]/accept` params(token) [auth]
- `GET` `/api/v1/invitations/[token]` params(token) → out: { invitation } [auth]
- `GET` `/api/v1/upload-token` → out: { token } [auth, upload]
- `PUT` `/api/v1/users/me/password` → out: { accessToken, refreshToken } [auth]
- `GET` `/api/v1/users/me` → out: { user } [db]
- `PATCH` `/api/v1/users/me` → out: { user } [db]
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/ancestors` params(id, catId) → out: { ancestors }
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/descendants` params(id, catId)
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/export` params(id, catId)
- `PATCH` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
- `DELETE` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
- `PUT` `/api/v1/workspaces/[id]/categories/reorder` params(id) → out: { ok }
- `GET` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
- `POST` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
- `GET` `/api/v1/workspaces/[id]/categories/tree` params(id)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/export` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/restore-version` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/versions` params(id, docId) → out: { versions }
- `GET` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
- `POST` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
- `DELETE` `/api/v1/workspaces/[id]/embed-tokens/[tokenId]` params(id, tokenId) [auth]
- `GET` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
- `POST` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
- `GET` `/api/v1/workspaces/[id]/graph` params(id)
- `POST` `/api/v1/workspaces/[id]/import` params(id) → out: { imported, documents, title, categoryId } [upload]
- `POST` `/api/v1/workspaces/[id]/invitations` params(id) → out: { invitation }
- `PATCH` `/api/v1/workspaces/[id]/join-requests/[requestId]` params(id, requestId) → out: { success }
- `PATCH` `/api/v1/workspaces/[id]/join-requests/batch` params(id)
- `GET` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
- `POST` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
- `PATCH` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
- `DELETE` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
- `GET` `/api/v1/workspaces/[id]/members` params(id) → out: { members }
- `GET` `/api/v1/workspaces/[id]/tags` params(id) → out: { tags }
- `GET` `/api/v1/workspaces/[id]/theme` params(id)
- `PATCH` `/api/v1/workspaces/[id]/theme` params(id)
- `POST` `/api/v1/workspaces/[id]/transfer` params(id) → out: { transferred }
- `POST` `/api/v1/workspaces/[id]/trash/[docId]/restore` params(id, docId) → out: { document }
- `DELETE` `/api/v1/workspaces/[id]/trash/[docId]` params(id, docId)
- `GET` `/api/v1/workspaces/[id]/trash` params(id) → out: { documents }
- `GET` `/api/v1/workspaces/public`
- `GET` `/api/v1/workspaces` → out: { workspaces }
- `POST` `/api/v1/workspaces` → out: { workspaces }
