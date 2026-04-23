# Route

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Route subsystem handles **55 routes** and touches: auth, db.

## Routes

- `GET` `/api/cron/cleanup-trash` → out: { error } [auth, db]
  `apps/web/app/api/cron/cleanup-trash/route.ts`
- `POST` `/api/v1/invitations/[token]/accept` params(token) [auth]
  `apps/web/app/api/v1/invitations/[token]/accept/route.ts`
- `GET` `/api/v1/invitations/[token]` params(token) → out: { invitation } [auth]
  `apps/web/app/api/v1/invitations/[token]/route.ts`
- `GET` `/api/v1/upload-token` → out: { token } [auth, upload]
  `apps/web/app/api/v1/upload-token/route.ts`
- `GET` `/api/v1/users/me` → out: { user } [db]
  `apps/web/app/api/v1/users/me/route.ts`
- `PATCH` `/api/v1/users/me` → out: { user } [db]
  `apps/web/app/api/v1/users/me/route.ts`
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/ancestors` params(id, catId) → out: { ancestors }
  `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/ancestors/route.ts`
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/descendants` params(id, catId)
  `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/descendants/route.ts`
- `GET` `/api/v1/workspaces/[id]/categories/[catId]/export` params(id, catId)
  `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/export/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
  `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/route.ts`
- `DELETE` `/api/v1/workspaces/[id]/categories/[catId]` params(id, catId) → out: { category }
  `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/route.ts`
- `PUT` `/api/v1/workspaces/[id]/categories/reorder` params(id) → out: { ok }
  `apps/web/app/api/v1/workspaces/[id]/categories/reorder/route.ts`
- `GET` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
  `apps/web/app/api/v1/workspaces/[id]/categories/route.ts`
- `POST` `/api/v1/workspaces/[id]/categories` params(id) → out: { categories }
  `apps/web/app/api/v1/workspaces/[id]/categories/route.ts`
- `GET` `/api/v1/workspaces/[id]/categories/tree` params(id)
  `apps/web/app/api/v1/workspaces/[id]/categories/tree/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/comments/route.ts`
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/comments` params(id, docId) → out: { comments }
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/comments/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/export` params(id, docId)
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/export/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/relations/route.ts`
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/relations` params(id, docId)
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/relations/route.ts`
- `POST` `/api/v1/workspaces/[id]/documents/[docId]/restore-version` params(id, docId)
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/restore-version/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]` params(id, docId) → out: { document } [db]
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/documents/[docId]` params(id, docId) → out: { document } [db]
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/route.ts`
- `DELETE` `/api/v1/workspaces/[id]/documents/[docId]` params(id, docId) → out: { document } [db]
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/tags/route.ts`
- `PUT` `/api/v1/workspaces/[id]/documents/[docId]/tags` params(id, docId) → out: { tags }
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/tags/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents/[docId]/versions` params(id, docId) → out: { versions }
  `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/versions/route.ts`
- `GET` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
  `apps/web/app/api/v1/workspaces/[id]/documents/route.ts`
- `POST` `/api/v1/workspaces/[id]/documents` params(id) → out: { document }
  `apps/web/app/api/v1/workspaces/[id]/documents/route.ts`
- `DELETE` `/api/v1/workspaces/[id]/embed-tokens/[tokenId]` params(id, tokenId) [auth]
  `apps/web/app/api/v1/workspaces/[id]/embed-tokens/[tokenId]/route.ts`
- `GET` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
  `apps/web/app/api/v1/workspaces/[id]/embed-tokens/route.ts`
- `POST` `/api/v1/workspaces/[id]/embed-tokens` params(id) [auth]
  `apps/web/app/api/v1/workspaces/[id]/embed-tokens/route.ts`
- `GET` `/api/v1/workspaces/[id]/graph` params(id)
  `apps/web/app/api/v1/workspaces/[id]/graph/route.ts`
- `POST` `/api/v1/workspaces/[id]/import` params(id) → out: { imported, documents, title, categoryId } [upload]
  `apps/web/app/api/v1/workspaces/[id]/import/route.ts`
- `POST` `/api/v1/workspaces/[id]/invitations` params(id) → out: { invitation }
  `apps/web/app/api/v1/workspaces/[id]/invitations/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/join-requests/[requestId]` params(id, requestId) → out: { success }
  `apps/web/app/api/v1/workspaces/[id]/join-requests/[requestId]/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/join-requests/batch` params(id)
  `apps/web/app/api/v1/workspaces/[id]/join-requests/batch/route.ts`
- `GET` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
  `apps/web/app/api/v1/workspaces/[id]/join-requests/route.ts`
- `POST` `/api/v1/workspaces/[id]/join-requests` params(id) → out: { joinRequest }
  `apps/web/app/api/v1/workspaces/[id]/join-requests/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
  `apps/web/app/api/v1/workspaces/[id]/members/[userId]/route.ts`
- `DELETE` `/api/v1/workspaces/[id]/members/[userId]` params(id, userId) → out: { member }
  `apps/web/app/api/v1/workspaces/[id]/members/[userId]/route.ts`
- `GET` `/api/v1/workspaces/[id]/members` params(id) → out: { members }
  `apps/web/app/api/v1/workspaces/[id]/members/route.ts`
- `GET` `/api/v1/workspaces/[id]` params(id) → out: { workspace } [db]
  `apps/web/app/api/v1/workspaces/[id]/route.ts`
- `PATCH` `/api/v1/workspaces/[id]` params(id) → out: { workspace } [db]
  `apps/web/app/api/v1/workspaces/[id]/route.ts`
- `DELETE` `/api/v1/workspaces/[id]` params(id) → out: { workspace } [db]
  `apps/web/app/api/v1/workspaces/[id]/route.ts`
- `GET` `/api/v1/workspaces/[id]/tags` params(id) → out: { tags }
  `apps/web/app/api/v1/workspaces/[id]/tags/route.ts`
- `GET` `/api/v1/workspaces/[id]/theme` params(id)
  `apps/web/app/api/v1/workspaces/[id]/theme/route.ts`
- `PATCH` `/api/v1/workspaces/[id]/theme` params(id)
  `apps/web/app/api/v1/workspaces/[id]/theme/route.ts`
- `POST` `/api/v1/workspaces/[id]/transfer` params(id) → out: { transferred }
  `apps/web/app/api/v1/workspaces/[id]/transfer/route.ts`
- `POST` `/api/v1/workspaces/[id]/trash/[docId]/restore` params(id, docId) → out: { document }
  `apps/web/app/api/v1/workspaces/[id]/trash/[docId]/restore/route.ts`
- `DELETE` `/api/v1/workspaces/[id]/trash/[docId]` params(id, docId)
  `apps/web/app/api/v1/workspaces/[id]/trash/[docId]/route.ts`
- `GET` `/api/v1/workspaces/[id]/trash` params(id) → out: { documents }
  `apps/web/app/api/v1/workspaces/[id]/trash/route.ts`
- `GET` `/api/v1/workspaces/public`
  `apps/web/app/api/v1/workspaces/public/route.ts`
- `GET` `/api/v1/workspaces` → out: { workspaces }
  `apps/web/app/api/v1/workspaces/route.ts`
- `POST` `/api/v1/workspaces` → out: { workspaces }
  `apps/web/app/api/v1/workspaces/route.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `apps/web/app/api/cron/cleanup-trash/route.ts`
- `apps/web/app/api/v1/invitations/[token]/accept/route.ts`
- `apps/web/app/api/v1/invitations/[token]/route.ts`
- `apps/web/app/api/v1/upload-token/route.ts`
- `apps/web/app/api/v1/users/me/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/ancestors/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/descendants/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/export/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/[catId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/reorder/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/categories/tree/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/comments/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/export/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/relations/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/restore-version/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/tags/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/[docId]/versions/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/documents/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/embed-tokens/[tokenId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/embed-tokens/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/graph/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/import/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/invitations/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/join-requests/[requestId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/join-requests/batch/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/join-requests/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/members/[userId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/members/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/tags/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/theme/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/transfer/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/trash/[docId]/restore/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/trash/[docId]/route.ts`
- `apps/web/app/api/v1/workspaces/[id]/trash/route.ts`
- `apps/web/app/api/v1/workspaces/public/route.ts`
- `apps/web/app/api/v1/workspaces/route.ts`

---
_Back to [overview.md](./overview.md)_