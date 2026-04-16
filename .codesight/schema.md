# Schema

### categories
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- name: varchar (required)
- parentId: bigint (fk)
- orderIndex: doublePrecision (default, required)
- _relations_: workspaceId -> workspaces.id, parentId -> categories.id

### category_closure
- ancestorId: bigint (fk, required)
- descendantId: bigint (fk, required)
- depth: integer (required)
- _relations_: ancestorId -> categories.id, descendantId -> categories.id

### comments
- id: bigserial (pk)
- documentId: bigint (fk, required)
- authorId: bigint (fk, required)
- content: text (required)
- parentId: bigint (fk)
- resolved: boolean (default, required)
- resolvedBy: bigint (fk)
- _relations_: documentId -> documents.id, authorId -> users.id, parentId -> comments.id, resolvedBy -> users.id

### document_relations
- id: bigserial (pk)
- sourceId: bigint (fk, required)
- targetId: bigint (fk, required)
- type: varchar (required)
- _relations_: sourceId -> documents.id, targetId -> documents.id

### documents
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- categoryId: bigint (fk)
- authorId: bigint (fk, required)
- title: varchar (required)
- content: text (default, required)
- currentVersion: integer (default, required)
- status: varchar (default, required)
- isDeleted: boolean (default, required)
- _relations_: workspaceId -> workspaces.id, categoryId -> categories.id, authorId -> users.id

### document_versions
- id: bigserial (pk)
- documentId: bigint (fk, required)
- version: integer (required)
- content: text (required)
- authorId: bigint (fk)
- _relations_: documentId -> documents.id, authorId -> users.id

### embed_tokens
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- creatorId: bigint (fk, required)
- label: varchar (required)
- tokenHash: varchar (unique, required)
- scope: varchar (required)
- expiresAt: timestamp (required)
- revokedAt: timestamp
- _relations_: workspaceId -> workspaces.id, creatorId -> users.id

### invitations
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- inviterId: bigint (fk, required)
- email: varchar (required)
- role: varchar (required)
- token: varchar (unique, required)
- status: varchar (default, required)
- expiresAt: timestamp (required)
- _relations_: workspaceId -> workspaces.id, inviterId -> users.id

### join_requests
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- userId: bigint (fk, required)
- message: text
- status: varchar (default, required)
- reviewedBy: bigint (fk)
- assignedRole: varchar
- _relations_: workspaceId -> workspaces.id, userId -> users.id, reviewedBy -> users.id

### refresh_tokens
- id: bigserial (pk)
- userId: bigint (fk, required)
- tokenHash: varchar (unique, required)
- expiresAt: timestamp (required)
- _relations_: userId -> users.id

### tags
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- name: varchar (required)
- _relations_: workspaceId -> workspaces.id

### document_tags
- documentId: bigint (fk, required)
- tagId: bigint (fk, required)
- _relations_: documentId -> documents.id, tagId -> tags.id

### users
- id: bigserial (pk)
- email: varchar (unique, required)
- passwordHash: varchar (required)
- name: varchar (required)
- avatarUrl: varchar
- emailVerified: boolean (default, required)
- emailVerifyToken: varchar
- emailVerifyExpiresAt: timestamp
- passwordResetToken: varchar
- passwordResetExpiresAt: timestamp
- lockedUntil: timestamp
- loginFailCount: integer (default, required)

### workspace_members
- id: bigserial (pk)
- workspaceId: bigint (fk, required)
- userId: bigint (fk, required)
- role: varchar (required)
- joinedAt: timestamp (default, required)
- _relations_: workspaceId -> workspaces.id, userId -> users.id

### workspaces
- id: bigserial (pk)
- name: varchar (required)
- isRoot: boolean (default, required)
- isPublic: boolean (default, required)
- ownerId: bigint (fk, required)
- themePreset: varchar (default, required)
- themeCss: text (default, required)
- _relations_: ownerId -> users.id
