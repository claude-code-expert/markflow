# API Contracts: KMS SaaS Platform v1

**Base URL**: `/api/v1`
**Auth**: Bearer JWT (Authorization header) + HttpOnly Cookie (Refresh Token)
**Content-Type**: `application/json`

## Auth

### POST /auth/register

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "name": "홍길동"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "홍길동",
  "emailVerified": false
}
```

**Errors**: 409 EMAIL_EXISTS, 400 INVALID_PASSWORD (8자 미만, 영문+숫자+특수문자 미충족)

### GET /auth/verify-email?token=xxx

**Response 200**: `{ "verified": true }`
**Errors**: 400 INVALID_TOKEN, 410 TOKEN_EXPIRED

### POST /auth/login

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "rememberMe": false
}
```

**Response 200**:
```json
{
  "accessToken": "jwt...",
  "user": { "id": "uuid", "email": "...", "name": "..." }
}
```
+ Set-Cookie: refreshToken (HttpOnly, SameSite=Strict, 7일 / rememberMe: 30일)

**Errors**: 401 INVALID_CREDENTIALS, 401 ACCOUNT_LOCKED (lockedUntil 포함), 403 EMAIL_NOT_VERIFIED, 429 RATE_LIMITED

### POST /auth/refresh

**Request**: Cookie에서 refreshToken 자동 전송
**Response 200**: `{ "accessToken": "jwt..." }`
**Errors**: 401 INVALID_REFRESH_TOKEN

### POST /auth/logout

**Response 204**: Refresh Token 무효화 + Cookie 삭제

## Users

### GET /users/me

**Response 200**: `{ "id", "email", "name", "avatarUrl", "emailVerified" }`

### PATCH /users/me

**Request**: `{ "name": "...", "avatarUrl": "..." }`
**Response 200**: 업데이트된 User 객체

### PUT /users/me/avatar

**Request**: multipart/form-data (file: JPG/PNG, max 2MB)
**Response 200**: `{ "avatarUrl": "https://..." }`

## Workspaces

### POST /workspaces

**Request**: `{ "name": "팀 워크스페이스", "slug": "team-ws" }`
**Response 201**: Workspace 객체 (isPublic: true 기본)
**Errors**: 409 SLUG_EXISTS

### GET /workspaces

**Response 200**: `{ "workspaces": [{ id, name, slug, isRoot, isPublic, role, lastActivityAt }] }`

### GET /workspaces/:id

**Response 200**: Workspace 상세 + 멤버 수

### PATCH /workspaces/:id

**Request**: `{ "name": "...", "isPublic": false }`
**Auth**: Owner only
**Errors**: 403 FORBIDDEN

### DELETE /workspaces/:id

**Request**: `{ "confirmName": "워크스페이스 이름" }`
**Auth**: Owner only
**Response 204**
**Errors**: 400 NAME_MISMATCH, 400 CANNOT_DELETE_ROOT

## Members

### GET /workspaces/:id/members

**Response 200**: `{ "members": [{ userId, name, email, avatarUrl, role, joinedAt }] }`

### PATCH /workspaces/:id/members/:userId

**Request**: `{ "role": "editor" }`
**Auth**: Owner/Admin
**Errors**: 400 CANNOT_CHANGE_OWNER_ROLE

### DELETE /workspaces/:id/members/:userId

**Auth**: Owner/Admin (Owner 자신은 제거 불가)
**Response 204**

## Invitations

### POST /workspaces/:id/invitations

**Request**: `{ "email": "new@example.com", "role": "editor" }`
**Auth**: Owner/Admin
**Response 201**: `{ "id", "email", "role", "token", "expiresAt" }`

### GET /invitations/:token

**Response 200**: `{ "workspace": { name, slug }, "role", "inviterName" }`
**Errors**: 410 INVITATION_EXPIRED

### POST /invitations/:token/accept

**Response 200**: `{ "workspaceId", "role" }`
**Errors**: 409 ALREADY_MEMBER, 410 INVITATION_EXPIRED

## Join Requests

### POST /workspaces/:id/join-requests

**Request**: `{ "message": "가입 신청합니다" }`
**Response 201**: JoinRequest 객체
**Errors**: 400 WORKSPACE_NOT_PUBLIC, 409 ALREADY_MEMBER, 409 ALREADY_REQUESTED

### GET /workspaces/:id/join-requests

**Auth**: Owner/Admin
**Response 200**: `{ "requests": [{ id, userId, userName, message, status, createdAt }] }`

### PATCH /workspaces/:id/join-requests/:requestId

**Request**: `{ "status": "approved", "role": "editor" }` or `{ "status": "rejected" }`
**Auth**: Owner/Admin
**Response 200**: 업데이트된 JoinRequest

### PATCH /workspaces/:id/join-requests/batch

**Request**: `{ "requestIds": ["id1", "id2"], "status": "approved", "role": "editor" }`
**Auth**: Owner/Admin
**Response 200**: `{ "updated": 2 }`

## Categories

### POST /workspaces/:wsId/categories

**Request**: `{ "name": "프로젝트", "parentId": null }`
**Response 201**: Category 객체
**Errors**: 409 DUPLICATE_NAME (같은 부모 아래)

### GET /workspaces/:wsId/categories

**Response 200**: `{ "categories": [{ id, name, parentId, depth, documentCount }] }` (트리 구조)

### PATCH /workspaces/:wsId/categories/:id

**Request**: `{ "name": "새 이름" }`
**Response 200**

### DELETE /workspaces/:wsId/categories/:id

**Response 204**: 하위 문서 루트 이동 후 삭제
**Errors**: 400 HAS_SUBCATEGORIES (하위 카테고리 존재 시 삭제 차단)

## Documents

### POST /workspaces/:wsId/documents

**Request**: `{ "title": "새 문서", "categoryId": "uuid" | null }`
**Auth**: Editor+
**Response 201**: Document 객체 (slug 자동 생성)

### GET /workspaces/:wsId/documents

**Query**: `?sort=updated_at&order=desc&categoryId=uuid&tagId=uuid&q=검색어&view=list|grid`
**Response 200**: `{ "documents": [...], "total": 100, "page": 1 }`

### GET /workspaces/:wsId/documents/:id

**Response 200**: Document 상세 (content 포함)

### PATCH /workspaces/:wsId/documents/:id

**Request**: `{ "content": "# Updated", "title": "변경된 제목" }`
**Auth**: Editor+
**Response 200**: 업데이트된 Document + 새 버전 생성

### DELETE /workspaces/:wsId/documents/:id

**Auth**: Editor+
**Response 204**: Soft Delete (is_deleted = true, deleted_at = now())

### GET /workspaces/:wsId/trash

**Response 200**: `{ "documents": [{ id, title, deletedAt, originalCategoryId }] }`

### POST /workspaces/:wsId/trash/:docId/restore

**Response 200**: 복원된 Document (원래 카테고리로, 카테고리 삭제 시 루트로)

### DELETE /workspaces/:wsId/trash/:docId

**Response 204**: 영구 삭제

## Document Versions

### GET /workspaces/:wsId/documents/:docId/versions

**Response 200**: `{ "versions": [{ id, version, createdAt }] }` (최대 20개)

## Tags

### PUT /workspaces/:wsId/documents/:docId/tags

**Request**: `{ "tags": ["태그1", "태그2"] }`
**Response 200**: `{ "tags": [...] }`
**Errors**: 400 TOO_MANY_TAGS (31개 이상)

### GET /workspaces/:wsId/tags

**Response 200**: `{ "tags": [{ id, name, documentCount }] }`

## Document Relations

### PUT /workspaces/:wsId/documents/:docId/relations

**Request**:
```json
{
  "prev": "docId" | null,
  "next": "docId" | null,
  "related": ["docId1", "docId2"]
}
```
**Response 200**: 업데이트된 관계
**Errors**: 400 CIRCULAR_REFERENCE, 400 TOO_MANY_RELATED_DOCS (21개 이상)

### GET /workspaces/:wsId/documents/:docId/relations

**Response 200**: `{ "prev": {...} | null, "next": {...} | null, "related": [...] }`

## Graph

### GET /workspaces/:wsId/graph

**Response 200**: 워크스페이스 전체 문서 관계 그래프 데이터
```json
{
  "nodes": [{ "id", "title", "type", "categoryId" }],
  "edges": [{ "source", "target", "type" }]
}
```

## Import/Export

### POST /workspaces/:wsId/import

**Request**: multipart/form-data (file: .md or .zip)
**Response 200**: `{ "imported": 5, "documents": [...] }`

### GET /workspaces/:wsId/documents/:id/export?format=md

**Response 200**: `Content-Type: text/markdown`, 파일 다운로드

### GET /workspaces/:wsId/categories/:id/export?format=zip

**Response 200**: `Content-Type: application/zip`, ZIP 다운로드

## Common Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Rate Limiting Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1711468800
```
