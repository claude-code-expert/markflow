# Frontend ↔ Backend API Contract

**Date**: 2026-03-27 | **Spec**: [../spec.md](../spec.md)

> 이 문서는 프론트엔드(apps/web)가 소비하는 백엔드(apps/api) API 엔드포인트의 계약을 정의한다.
> 백엔드는 변경하지 않으며, 프론트엔드가 정확히 이 형식에 맞춰 요청/응답을 처리해야 한다.

## Base Configuration

```
Base URL: ${NEXT_PUBLIC_API_URL} (default: http://localhost:4000/api/v1)
Auth: Bearer token in Authorization header
Cookies: credentials: 'include' (refreshToken은 HttpOnly cookie)
Content-Type: application/json
```

---

## 1. Authentication

### POST /auth/login

**User Story**: US-1 (로그인 후 워크스페이스 진입)

```
Request:
  Body: { email: string, password: string, rememberMe?: boolean }

Response 200:
  Set-Cookie: refreshToken=<hash>; HttpOnly; SameSite=Strict; Path=/
  Body: {
    accessToken: string,
    user: {
      id: string,
      email: string,
      name: string,
      avatarUrl: string | null,
      emailVerified: boolean,
      createdAt: string,
      updatedAt: string
    }
  }

Error 401: { error: { code: "INVALID_CREDENTIALS", message: string } }
Error 401: { error: { code: "ACCOUNT_LOCKED", message: string } }
Error 401: { error: { code: "EMAIL_NOT_VERIFIED", message: string } }
Error 429: { error: { code: "RATE_LIMITED", message: string } }
```

**Frontend action**: accessToken을 localStorage에 저장, user를 auth-store에 설정, `/` 로 이동

### POST /auth/register

```
Request:
  Body: { email: string, password: string, name: string }

Response 201:
  Body: {
    user: { id, email, name, avatarUrl, emailVerified, createdAt, updatedAt }
  }

Error 409: { error: { code: "EMAIL_EXISTS", message: string } }
Error 400: { error: { code: "INVALID_FIELDS", message: string } }
```

### POST /auth/refresh

```
Request: (no body, refreshToken cookie 자동 전송)

Response 200:
  Body: { accessToken: string }

Error 401: (refresh token 만료/무효 → /login 리다이렉트)
```

### POST /auth/logout

```
Request: (no body)
Response 204: (no body, refreshToken cookie 삭제)
```

### GET /users/me

```
Response 200:
  Body: {
    user: { id, email, name, avatarUrl, emailVerified, createdAt, updatedAt }
  }

Error 401: (토큰 무효)
```

---

## 2. Workspaces

### GET /workspaces

**User Story**: US-1 (워크스페이스 목록), US-4 (워크스페이스 관리)

```
Response 200:
  Body: {
    workspaces: [
      {
        id: string,
        name: string,
        slug: string,
        isRoot: boolean,
        isPublic: boolean,
        ownerId: string,
        createdAt: string,
        updatedAt: string,
        role: "owner" | "admin" | "editor" | "viewer",
        lastActivityAt: string
      }
    ]
  }
```

**CRITICAL**: 응답은 `{ workspaces: [...] }` 래퍼. 배열 직접 반환이 아님.

### POST /workspaces

**User Story**: US-4 (워크스페이스 생성)

```
Request:
  Body: { name: string, slug: string }

Response 201:
  Body: {
    workspace: { id, name, slug, isRoot, isPublic, ownerId, createdAt, updatedAt }
  }

Error 409: { error: { code: "SLUG_EXISTS", message: string } }
```

### GET /workspaces/:id

```
Response 200:
  Body: {
    workspace: { id, name, slug, isRoot, isPublic, ownerId, createdAt, updatedAt, memberCount: number }
  }
```

### PATCH /workspaces/:id

**User Story**: US-4 (워크스페이스 설정)

```
Request:
  Body: { name?: string, isPublic?: boolean }

Response 200:
  Body: { workspace: { ...full object } }

Error 403: (owner 권한 필요)
```

---

## 3. Documents

### GET /workspaces/:wsId/documents

**User Story**: US-3 (문서 목록)

```
Query params:
  categoryId?: string
  sort?: "title" | "updatedAt" | "createdAt"  (default: "updatedAt")
  order?: "asc" | "desc"                       (default: "desc")
  q?: string                                   (title ILIKE 검색)
  page?: string                                (default: "1")
  limit?: string                               (default: "20")

Response 200:
  Body: {
    documents: [
      {
        id: string,
        workspaceId: string,
        authorId: string,
        title: string,
        slug: string,
        content: string,
        categoryId: string | null,
        currentVersion: number,
        isDeleted: boolean,
        createdAt: string,
        updatedAt: string
      }
    ],
    total: number,
    page: number
  }
```

### POST /workspaces/:wsId/documents

**User Story**: US-3 (문서 생성)

```
Request:
  Body: { title: string, categoryId?: string, content?: string }

Response 201:
  Body: {
    document: { id, workspaceId, authorId, title, slug, content, categoryId, currentVersion, isDeleted, createdAt, updatedAt }
  }
```

**Frontend action**: 생성 후 `/${workspaceSlug}/docs/${document.id}` 에디터로 이동

### GET /workspaces/:wsId/documents/:id

**User Story**: US-3 (문서 편집)

```
Response 200:
  Body: { document: { ...full object } }

Error 404: { error: { code: "NOT_FOUND", message: string } }
```

### PATCH /workspaces/:wsId/documents/:id

**User Story**: US-3 (자동 저장)

```
Request:
  Body: { title?: string, content?: string }

Response 200:
  Body: { document: { ...full object } }
```

**Frontend action**: 1초 디바운스 후 content 변경분 PATCH. saveStatus: unsaved → saving → saved/error

### DELETE /workspaces/:wsId/documents/:id

**User Story**: US-3 (문서 삭제 → 휴지통)

```
Response 204: (soft delete)
```

---

## 4. Categories (Folders)

### GET /workspaces/:wsId/categories

**User Story**: US-2 (사이드바 폴더 트리), US-3 (문서 필터)

```
Response 200:
  Body: {
    categories: [
      {
        id: string,
        workspaceId: string,
        name: string,
        parentId: string | null,
        depth: number,
        createdAt: string
      }
    ]
  }
```

### POST /workspaces/:wsId/categories

```
Request:
  Body: { name: string, parentId?: string }

Response 201:
  Body: { category: { id, workspaceId, name, parentId, createdAt } }
```

### DELETE /workspaces/:wsId/categories/:id

```
Request:
  Body: { confirmName: string }

Response 204: (하위 문서는 root로 이동, 하위 카테고리 존재 시 거부)
```

---

## 5. Tags

### GET /workspaces/:wsId/tags

```
Response 200:
  Body: { tags: [{ id: string, workspaceId: string, name: string }] }
```

---

## 6. Members & Invitations

### GET /workspaces/:id/members

**User Story**: US-4 (멤버 관리)

```
Response 200:
  Body: {
    members: [
      {
        id: string,
        userId: string,
        role: "owner" | "admin" | "editor" | "viewer",
        joinedAt: string,
        userName: string,
        userEmail: string,
        userAvatarUrl: string | null
      }
    ]
  }
```

### POST /workspaces/:id/invitations

**User Story**: US-4 (멤버 초대)

```
Request:
  Body: { email: string, role: "admin" | "editor" | "viewer" }

Response 201:
  Body: { invitation: { id, workspaceId, inviterId, email, role, token, status, expiresAt, createdAt } }
```

---

## 7. Trash

### GET /workspaces/:wsId/trash

```
Response 200:
  Body: {
    documents: [{ ...document with isDeleted: true, deletedAt: string }]
  }
```

### POST /workspaces/:wsId/trash/:docId/restore

```
Response 200:
  Body: { document: { ...restored document } }
```

---

## Error Handling Contract

모든 에러 응답은 다음 형식을 따른다:

```typescript
interface ApiError {
  error: {
    code: string;    // 머신 식별용 코드
    message: string; // 사람 읽기용 메시지
  }
}
```

**프론트엔드 처리 규칙**:
- `401` + 토큰 존재: refresh 시도 → 실패 시 /login 리다이렉트
- `401` + 토큰 없음: /login 리다이렉트
- `403`: 권한 부족 메시지 표시
- `404`: 리소스 없음 → 목록으로 이동 또는 404 페이지
- `409`: 충돌 (slug 중복 등) → 필드 에러 메시지
- `429`: Rate limit → 재시도 대기 메시지
