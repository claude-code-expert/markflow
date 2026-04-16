# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**drizzle** — 15 models

### categories

pk: `id` (bigserial) · fk: workspaceId, parentId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `name`: varchar _(required)_
- `parentId`: bigint _(fk)_
- `orderIndex`: doublePrecision _(default, required)_
- _relations_: workspaceId -> workspaces.id, parentId -> categories.id

### category_closure

fk: ancestorId, descendantId

- `ancestorId`: bigint _(fk, required)_
- `descendantId`: bigint _(fk, required)_
- `depth`: integer _(required)_
- _relations_: ancestorId -> categories.id, descendantId -> categories.id

### comments

pk: `id` (bigserial) · fk: documentId, authorId, parentId, resolvedBy

- `id`: bigserial _(pk)_
- `documentId`: bigint _(fk, required)_
- `authorId`: bigint _(fk, required)_
- `content`: text _(required)_
- `parentId`: bigint _(fk)_
- `resolved`: boolean _(default, required)_
- `resolvedBy`: bigint _(fk)_
- _relations_: documentId -> documents.id, authorId -> users.id, parentId -> comments.id, resolvedBy -> users.id

### document_relations

pk: `id` (bigserial) · fk: sourceId, targetId

- `id`: bigserial _(pk)_
- `sourceId`: bigint _(fk, required)_
- `targetId`: bigint _(fk, required)_
- `type`: varchar _(required)_
- _relations_: sourceId -> documents.id, targetId -> documents.id

### documents

pk: `id` (bigserial) · fk: workspaceId, categoryId, authorId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `categoryId`: bigint _(fk)_
- `authorId`: bigint _(fk, required)_
- `title`: varchar _(required)_
- `content`: text _(default, required)_
- `currentVersion`: integer _(default, required)_
- `status`: varchar _(default, required)_
- `isDeleted`: boolean _(default, required)_
- _relations_: workspaceId -> workspaces.id, categoryId -> categories.id, authorId -> users.id

### document_versions

pk: `id` (bigserial) · fk: documentId, authorId

- `id`: bigserial _(pk)_
- `documentId`: bigint _(fk, required)_
- `version`: integer _(required)_
- `content`: text _(required)_
- `authorId`: bigint _(fk)_
- _relations_: documentId -> documents.id, authorId -> users.id

### embed_tokens

pk: `id` (bigserial) · fk: workspaceId, creatorId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `creatorId`: bigint _(fk, required)_
- `label`: varchar _(required)_
- `tokenHash`: varchar _(unique, required)_
- `scope`: varchar _(required)_
- `expiresAt`: timestamp _(required)_
- `revokedAt`: timestamp
- _relations_: workspaceId -> workspaces.id, creatorId -> users.id

### invitations

pk: `id` (bigserial) · fk: workspaceId, inviterId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `inviterId`: bigint _(fk, required)_
- `email`: varchar _(required)_
- `role`: varchar _(required)_
- `token`: varchar _(unique, required)_
- `status`: varchar _(default, required)_
- `expiresAt`: timestamp _(required)_
- _relations_: workspaceId -> workspaces.id, inviterId -> users.id

### join_requests

pk: `id` (bigserial) · fk: workspaceId, userId, reviewedBy

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `userId`: bigint _(fk, required)_
- `message`: text
- `status`: varchar _(default, required)_
- `reviewedBy`: bigint _(fk)_
- `assignedRole`: varchar
- _relations_: workspaceId -> workspaces.id, userId -> users.id, reviewedBy -> users.id

### refresh_tokens

pk: `id` (bigserial) · fk: userId

- `id`: bigserial _(pk)_
- `userId`: bigint _(fk, required)_
- `tokenHash`: varchar _(unique, required)_
- `expiresAt`: timestamp _(required)_
- _relations_: userId -> users.id

### tags

pk: `id` (bigserial) · fk: workspaceId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `name`: varchar _(required)_
- _relations_: workspaceId -> workspaces.id

### document_tags

fk: documentId, tagId

- `documentId`: bigint _(fk, required)_
- `tagId`: bigint _(fk, required)_
- _relations_: documentId -> documents.id, tagId -> tags.id

### users

pk: `id` (bigserial)

- `id`: bigserial _(pk)_
- `email`: varchar _(unique, required)_
- `passwordHash`: varchar _(required)_
- `name`: varchar _(required)_
- `avatarUrl`: varchar
- `emailVerified`: boolean _(default, required)_
- `emailVerifyToken`: varchar
- `emailVerifyExpiresAt`: timestamp
- `passwordResetToken`: varchar
- `passwordResetExpiresAt`: timestamp
- `lockedUntil`: timestamp
- `loginFailCount`: integer _(default, required)_

### workspace_members

pk: `id` (bigserial) · fk: workspaceId, userId

- `id`: bigserial _(pk)_
- `workspaceId`: bigint _(fk, required)_
- `userId`: bigint _(fk, required)_
- `role`: varchar _(required)_
- `joinedAt`: timestamp _(default, required)_
- _relations_: workspaceId -> workspaces.id, userId -> users.id

### workspaces

pk: `id` (bigserial) · fk: ownerId

- `id`: bigserial _(pk)_
- `name`: varchar _(required)_
- `isRoot`: boolean _(default, required)_
- `isPublic`: boolean _(default, required)_
- `ownerId`: bigint _(fk, required)_
- `themePreset`: varchar _(default, required)_
- `themeCss`: text _(default, required)_
- _relations_: ownerId -> users.id

## Schema Source Files

Read and edit these files when adding columns, creating migrations, or changing relations:

- `packages/db/src/schema/users.ts` — imported by **9** files
- `packages/db/src/schema/workspaces.ts` — imported by **8** files

---
_Back to [overview.md](./overview.md)_