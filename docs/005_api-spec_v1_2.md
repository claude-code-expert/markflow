# 005 — API 스펙 (REST API Specification)

> **최종 수정:** 2026-03-26 (v1.2.0 반영)
> **Base URL:** `https://api.markflow.io/api/v1`
> **인증:** `Authorization: Bearer <access_token>` (명시된 엔드포인트 제외)
> **Content-Type:** `application/json`
> **상태:** 📋 계획됨 (KMS SaaS 구축 시 적용)
> **변경 이력:** v1.2.0 — Section 4 Categories API 상세화 (이동·Closure Table 동기화·에러 코드), Section 5 POST documents `startMode` 파라미터 추가, Section 13 그래프 뷰 API 신규 추가

---

## 공통 에러 포맷

```json
{ "error": { "code": "ERROR_CODE", "message": "설명", "details": {} } }
```

| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 입력값 유효성 실패 |
| 401 | `UNAUTHORIZED` | 인증 토큰 없거나 만료 |
| 403 | `FORBIDDEN` | 권한 부족 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복 (이메일, slug 등) |
| 429 | `RATE_LIMITED` | 요청 횟수 초과 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

---

## 1. 인증 (Auth)

### POST /auth/register
**Request** `{ "email": "...", "password": "Password123!", "name": "Jane" }`
**Response** `201` `{ "message": "인증 이메일이 발송되었습니다.", "userId": "uuid" }`

### POST /auth/login
**Request** `{ "email": "...", "password": "...", "rememberMe": false }`
**Response** `200` `{ "accessToken": "...", "user": { id, email, name, avatarUrl } }`
> Refresh Token → `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict`

**실패 케이스 (C3 명확화)**

| 상황 | HTTP | code |
|------|------|------|
| 이메일/비밀번호 불일치 | `401` | `INVALID_CREDENTIALS` |
| 동일 계정 5회 연속 실패 → 15분 계정 잠금 | `401` | `ACCOUNT_LOCKED` + `lockedUntil: ISO8601` |
| IP 기준 10회/15분 초과 | `429` | `RATE_LIMITED` |
| 이메일 미인증 | `403` | `EMAIL_NOT_VERIFIED` |

### POST /auth/refresh
Cookie의 refreshToken으로 Access Token 갱신
**Response** `200` `{ "accessToken": "..." }`

### POST /auth/logout
**Request** `{ "allDevices": false }`
**Response** `204`

### POST /auth/verify-email
**Request** `{ "token": "..." }`
**Response** `200`

### POST /auth/forgot-password
**Request** `{ "email": "..." }`
**Response** `200` (항상 성공 — 이메일 존재 여부 미노출)

### POST /auth/reset-password
**Request** `{ "token": "...", "newPassword": "..." }`
**Response** `200`

---

## 2. 사용자 (Users)

### GET /users/me
**Response** `200` `{ id, email, name, bio, avatarUrl, emailVerified, createdAt }`

### PATCH /users/me
**Request** `{ "name": "...", "bio": "..." }`
**Response** `200`

### POST /users/me/avatar
`multipart/form-data` · `file`: JPG/PNG, 최대 2MB
**Response** `200` `{ "avatarUrl": "..." }`

### PATCH /users/me/password
**Request** `{ "currentPassword": "...", "newPassword": "..." }`
**Response** `200`

---

## 3. 워크스페이스 (Workspaces)

### GET /workspaces
내가 속한 워크스페이스 목록
**Response** `200` `{ workspaces: [{ id, name, slug, role, memberCount, documentCount, updatedAt }] }`

### POST /workspaces
**Request** `{ "name": "...", "slug": "...", "description": "..." }`
**Response** `201` `{ id, name, slug, role: "owner" }`

### GET /workspaces/:workspaceId
**Response** `200` `{ id, name, slug, description, themeCss, isPublic, memberCount, createdAt }`

### PATCH /workspaces/:workspaceId `[Admin+]`
**Request** `{ "name": "...", "description": "...", "isPublic": true }`

### DELETE /workspaces/:workspaceId `[Owner]`
**Request** `{ "confirmName": "dev-team" }`
**Response** `204`

### PATCH /workspaces/:workspaceId/theme `[Admin+]`
**Request** `{ "css": "..." }`
**Response** `200` `{ "themeCss": "..." }`

### GET /workspaces/:workspaceId/members
**Response** `200` `{ members: [{ userId, name, email, avatarUrl, role, joinedAt }] }`

### POST /workspaces/:workspaceId/invitations `[Admin+]`
**Request** `{ "email": "...", "role": "editor" }`
**Response** `201` `{ invitationId, expiresAt }`

### GET /invitations/:token
초대 토큰 유효성 확인 (공개 엔드포인트, 인증 불필요)
**Response** `200` `{ workspaceName, inviterName, role, expiresAt }`
**Error** `404` `{ "code": "INVITATION_NOT_FOUND" }` · `410` `{ "code": "INVITATION_EXPIRED" }`

### POST /invitations/:token/accept
초대 수락 — 로그인 또는 회원가입 후 호출 (인증 필요)
**Response** `200` `{ workspaceId, workspaceSlug, role }`
**Error** `409` `{ "code": "ALREADY_MEMBER" }` · `410` `{ "code": "INVITATION_EXPIRED" }`

### PATCH /workspaces/:workspaceId/members/:userId `[Admin+]`
**Request** `{ "role": "viewer" }`

### DELETE /workspaces/:workspaceId/members/:userId `[Admin+]`
**Response** `204`

---

## 4. 카테고리 (Categories)

### GET /workspaces/:workspaceId/categories
카테고리 트리 전체 (중첩 `children` 포함, Closure Table 기반)
**Response** `200`
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "001 Requirements",
      "slug": "001-requirements",
      "parentId": null,
      "orderIndex": 1.0,
      "depth": 0,
      "documentCount": 12,
      "children": [
        { "id": "uuid", "name": "Sub Category", "parentId": "uuid", "depth": 1, "children": [] }
      ]
    }
  ]
}
```

### GET /workspaces/:workspaceId/categories/:categoryId/ancestors
카테고리 상위 경로 (breadcrumb) 조회 — Closure Table 활용
**Response** `200` `{ "ancestors": [{ id, name, slug, depth }] }` (depth 내림차순, root 먼저)

### GET /workspaces/:workspaceId/categories/:categoryId/descendants
특정 카테고리의 모든 하위 카테고리 조회
**Query:** `depth` (최대 탐색 깊이, 기본: 전체)
**Response** `200` `{ "descendants": [{ id, name, slug, parentId, depth }] }`

### POST /workspaces/:workspaceId/categories `[Editor+]`
**Request** `{ "name": "...", "parentId": null, "orderIndex": 2.0 }`
**Response** `201` `{ id, name, slug, parentId, orderIndex, depth, documentCount: 0 }`

| 에러 | 코드 | 조건 |
|------|------|------|
| `400` | `INVALID_NAME` | 이름 1자 미만 또는 100자 초과 |
| `409` | `DUPLICATE_CATEGORY_NAME` | 같은 부모 아래 동일 이름 존재 |
| `403` | `FORBIDDEN` | Editor 미만 역할 |

### PATCH /workspaces/:workspaceId/categories/:categoryId `[Editor+]`
이름 변경 또는 `orderIndex` 업데이트
**Request** `{ "name": "...", "orderIndex": 1.5 }`
**Response** `200` `{ id, name, slug, orderIndex, updatedAt }`

> `parentId` 변경(이동)은 별도 엔드포인트 사용 (`POST .../move`)

### POST /workspaces/:workspaceId/categories/:categoryId/move `[Editor+]`
카테고리를 다른 부모 아래로 이동. Closure Table 동기화 트랜잭션 포함.
**Request** `{ "newParentId": "uuid | null" }`
**Response** `200` `{ id, name, parentId, depth, updatedAt }`

| 에러 | 코드 | 조건 |
|------|------|------|
| `400` | `CIRCULAR_CATEGORY` | 자기 자신 또는 자신의 자손으로 이동 시도 |
| `404` | `CATEGORY_NOT_FOUND` | newParentId가 존재하지 않는 경우 |

### DELETE /workspaces/:workspaceId/categories/:categoryId `[Editor+]`
카테고리 삭제. 하위 카테고리도 재귀 삭제. 문서는 `category_id = NULL` 처리(루트 이동).
**Query** `?handleDocuments=move|delete` (기본: `move`)
**Response** `204`

| 에러 | 코드 | 조건 |
|------|------|------|
| `400` | `NON_EMPTY_CATEGORY` | `handleDocuments` 미지정 시 문서 존재하는 경우 안전 차단 |

---

## 5. 문서 (Documents)

### GET /workspaces/:workspaceId/documents
**Query:** `categoryId`, `sort` (updatedAt|createdAt|title), `order` (asc|desc), `page`, `limit`, `deleted`
**Response** `200` `{ documents: [{ id, title, slug, categoryId, authorName, currentVersion, updatedAt }], total, page, limit }`

### POST /workspaces/:workspaceId/documents `[Editor+]`
**Request**
```json
{
  "title": "문서 제목",
  "categoryId": "uuid | null",
  "content": "",
  "startMode": "blank | template"
}
```
**Response** `201` `{ id, title, slug, content, categoryId, currentVersion: 1 }`

### GET /workspaces/:workspaceId/documents/:documentId
**Response** `200`
```json
{
  "id": "uuid",
  "title": "...",
  "slug": "...",
  "content": "...",
  "categoryId": "uuid | null",
  "categoryPath": [{ "id": "uuid", "name": "001 Requirements" }],
  "authorId": "uuid",
  "currentVersion": 12,
  "tags": ["requirements", "p0"],
  "dagLinks": {
    "prevDoc":     { "id": "uuid", "title": "000 — 프로젝트 개요" },
    "nextDoc":     { "id": "uuid", "title": "002 — 컴포넌트 설계" },
    "relatedDocs": [
      { "id": "uuid", "title": "007 — 아키텍처" },
      { "id": "uuid", "title": "008 — 로드맵" }
    ]
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

> **v1.2.0 변경:** `prevDocId`/`nextDocId` 단순 ID 필드 → `dagLinks` 객체로 변경. title 포함하여 DAG 렌더링 시 별도 조회 불필요. `categoryPath`로 breadcrumb 즉시 렌더링 가능.

### PATCH /workspaces/:workspaceId/documents/:documentId `[Editor+]`
자동저장 포함
**Request** `{ "title": "...", "content": "...", "categoryId": "uuid" }`
**Response** `200` `{ id, currentVersion, updatedAt }`

### DELETE /workspaces/:workspaceId/documents/:documentId `[Editor+]`
Soft Delete
**Response** `204`

### POST /workspaces/:workspaceId/documents/:documentId/restore `[Editor+]`
휴지통에서 복원
**Response** `200`

### GET /workspaces/:workspaceId/documents/:documentId/versions `P1`
**Response** `200` `{ versions: [{ versionNum, authorName, createdAt }] }`

### GET /workspaces/:workspaceId/documents/:documentId/versions/:versionNum `P1`
**Response** `200` `{ content, versionNum }`

### POST /workspaces/:workspaceId/documents/:documentId/restore-version `P1` `[Editor+]`
**Request** `{ "versionNum": 10 }`
**Response** `200` `{ "newVersion": 15 }`

### PATCH /workspaces/:workspaceId/documents/:documentId/links `[Editor+]`
**Request** `{ "prevDocId": "uuid|null", "nextDocId": "uuid|null", "relatedDocIds": ["uuid1"] }`
> 연관 문서(`relatedDocIds`) 최대 20개 초과 시 `400 { code: "TOO_MANY_RELATED_DOCS" }` 반환

### GET /workspaces/:workspaceId/documents/:documentId/tags
**Response** `200` `{ tags: ["string"] }`

### PUT /workspaces/:workspaceId/documents/:documentId/tags `[Editor+]`
태그 목록 전체 교체 (upsert)
**Request** `{ "tags": ["tag1", "tag2"] }` — 최대 30개, 태그당 최대 50자
**Response** `200` `{ tags: ["tag1", "tag2"] }`

### GET /workspaces/:workspaceId/tags
워크스페이스 내 사용 중인 태그 목록 (검색 필터 자동완성용)
**Response** `200` `{ tags: [{ name, count }] }`

---

## 10. 버전 Diff `P1`

### GET /workspaces/:workspaceId/documents/:documentId/versions/diff
두 버전 간 차이 반환
**Query:** `from` (versionNum), `to` (versionNum)
**Response** `200`
```json
{
  "fromVersion": 3,
  "toVersion": 5,
  "diff": [
    { "type": "equal",   "value": "# Title\n" },
    { "type": "delete",  "value": "Old paragraph.\n" },
    { "type": "insert",  "value": "New paragraph.\n" }
  ]
}
```
> 서버사이드 Myers diff 알고리즘 적용 (fast-diff 라이브러리)

---

## 6. 검색 (Search) `P1`

### GET /workspaces/:workspaceId/search
**Query:** `q` (필수), `categoryId`, `tag`, `authorId`, `from`, `to`, `page`, `limit`
**Response** `200` `{ results: [{ documentId, title, snippet, score, updatedAt }], total, query }`

---

## 7. 링크 프리뷰 `P1`

### POST /link-preview
**Request** `{ "url": "https://..." }`
**Response** `200` `{ url, ogTitle, ogDescription, ogImage, ogSiteName, previewType, cached }`
**Error** `422` `{ "error": { "code": "NO_OG_DATA" } }`

---

## 8. Import / Export

### POST /workspaces/:workspaceId/import `[Editor+]`
`multipart/form-data` · `file`: `.md`, `.zip`, `.html` · `categoryId` · `conflictStrategy`: overwrite|create_new
**Response** `202` `{ jobId, statusUrl }`

| 파일 형식 | 처리 방법 |
|-----------|-----------|
| `.md` | 직접 파싱 후 문서 생성 |
| `.zip` | 압축 해제 후 폴더 구조 유지하며 일괄 생성 |
| `.html` | 서버사이드 Turndown(HTML→MD) 변환 후 저장 |
| `.pdf` | pdfjs-dist 텍스트 추출 → Markdown 변환 (P2, 베스트 에포트) |

### GET /workspaces/:workspaceId/export `[Editor+]`
**Query:** `documentId`, `categoryId`, `format` (md|zip|html|pdf)

| format | 처리 방법 | 응답 |
|--------|-----------|------|
| `md` | 단일 문서 | `200` + `text/markdown` |
| `html` | 렌더링된 HTML (인라인 CSS + 워크스페이스 테마 적용) | `200` + `text/html` |
| `pdf` | 서버사이드 Puppeteer PDF 생성 (워크스페이스 테마 CSS 적용) | `202` + 비동기 링크 |
| `zip` | 카테고리 전체 — md 묶음 | `202` + 비동기 링크 |

---

## 9. 댓글 (Comments) `P1`

> **C5 수정:** 모든 댓글 API는 workspace 범위 강제 (RLS 원칙 준수)

### GET /workspaces/:workspaceId/documents/:documentId/comments
스레드 구조 (replies 중첩)

### POST /workspaces/:workspaceId/documents/:documentId/comments `[Viewer+]`
**Request** `{ "selection": { from, to, text }, "content": "..." }`

### PATCH /workspaces/:workspaceId/documents/:documentId/comments/:commentId `[본인/Admin+]`
**Request** `{ "content": "...", "resolved": true }`

### DELETE /workspaces/:workspaceId/documents/:documentId/comments/:commentId `[본인/Admin+]`
**Response** `204`

---

## 11. Rate Limiting

| 엔드포인트 | 제한 | 윈도우 | 비고 |
|-----------|------|--------|------|
| POST /auth/login | 10 req | 15분/IP | IP 기준 Rate Limit (C3: 계정 잠금과 별개) |
| POST /auth/register | 5 req | 1시간/IP | — |
| POST /link-preview | 30 req | 1분/User | — |
| PATCH /documents (자동저장) | 60 req | 1분/User | — |
| GET /search | 30 req | 1분/User | — |
| GET /versions/diff | 20 req | 1분/User | diff 연산 비용 고려 |
| POST /import | 5 req | 1분/User | 파일 처리 비용 고려 |
| 기타 | 300 req | 1분/User | — |

---

## 12. Embed 연동 API `P1`

> M5 추가: 외부 프로젝트에서 KMS 문서를 embed할 수 있는 Guest Token 발급 방식

### POST /workspaces/:workspaceId/embed-tokens `[Admin+]`
Guest Token 발급 — 외부 앱·iframe이 KMS에 접근할 때 사용하는 단기 토큰
**Request**
```json
{
  "label": "My Blog CMS",
  "scope": "read" | "read_write",
  "allowedDocIds": ["uuid1"],        // 특정 문서만 허용 (null = 워크스페이스 전체)
  "expiresAt": "2027-01-01T00:00:00Z" // null = 영구 (취소 전까지)
}
```
**Response** `201` `{ tokenId, token, label, scope, expiresAt }`

### GET /workspaces/:workspaceId/embed-tokens `[Admin+]`
발급된 토큰 목록 조회
**Response** `200` `{ tokens: [{ tokenId, label, scope, createdAt, expiresAt, lastUsedAt }] }`

### DELETE /workspaces/:workspaceId/embed-tokens/:tokenId `[Admin+]`
토큰 즉시 폐기
**Response** `204`

### GET /embed/doc/:documentId `[Guest Token]`
iframe embed용 문서 뷰어 HTML 페이지 반환
**Query:** `token` (Guest Token), `readOnly` (true|false), `theme` (light|dark), `hideToolbar` (true|false)
**Response** `200` + `text/html` — 에디터 또는 Preview 전용 페이지

> **인증 방법:** Guest Token은 `Authorization: Bearer <token>` 또는 쿼리 파라미터 `?token=...` 양쪽 허용  
> **postMessage 이벤트:** iframe ↔ 부모 창 통신 프로토콜
> ```
> 부모 → iframe: { type: "mf:set-content", content: "# Hello" }
> iframe → 부모: { type: "mf:content-changed", content: "..." }
> iframe → 부모: { type: "mf:saved", documentId: "...", version: 5 }
> iframe → 부모: { type: "mf:ready" }
> ```

---

## 13. 그래프 뷰 API `P1` 🚧

> DAG Pipeline Graph 렌더링에 필요한 전체 문서 연결 구조 데이터를 반환.

### GET /workspaces/:workspaceId/graph
워크스페이스 전체 문서의 계층·순서·태그 관계를 DAG Row 구조로 반환.

**Response** `200`
```json
{
  "rows": [
    {
      "type": "category_flow",
      "label": "001 Requirements · 문서 순서 흐름",
      "stages": [
        {
          "type": "root",
          "nodes": [{ "id": null, "title": "MarkFlow Dev", "icon": "workspace" }]
        },
        {
          "type": "category",
          "nodes": [{ "id": "uuid", "title": "001 Requirements", "documentCount": 12 }]
        },
        {
          "type": "prev",
          "nodes": [{ "id": "uuid", "title": "000 — 프로젝트 개요", "updatedAt": "..." }]
        },
        {
          "type": "current_group",
          "label": "현재 문서 + 연관",
          "nodes": [
            { "id": "uuid", "title": "001 — 기능 요구사항", "nodeType": "current" },
            { "id": "uuid", "title": "007 — 아키텍처",     "nodeType": "related", "tagLink": "architecture" },
            { "id": "uuid", "title": "008 — 로드맵",       "nodeType": "related", "tagLink": "roadmap" }
          ]
        },
        {
          "type": "next",
          "nodes": [{ "id": "uuid", "title": "002 — 컴포넌트 설계", "updatedAt": "..." }]
        }
      ]
    },
    {
      "type": "tag_cluster",
      "label": "태그 연관 클러스터",
      "stages": [
        {
          "type": "tag_group",
          "tag": "requirements",
          "nodes": [
            { "id": "uuid", "title": "001 — 기능 요구사항" },
            { "id": "uuid", "title": "000 — 프로젝트 개요" }
          ]
        }
      ]
    }
  ],
  "meta": {
    "totalDocuments": 87,
    "totalCategories": 4,
    "totalRelations": 23
  }
}
```

**Query 파라미터**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `focusDocId` | `uuid` | — | 특정 문서 중심으로 필터링 |
| `categoryId` | `uuid` | — | 특정 카테고리 Row만 반환 |
| `tag` | `string` | — | 특정 태그 클러스터만 반환 |
| `rowTypes` | `category_flow,tag_cluster,parallel_group` | 전체 | 표시할 Row 유형 선택 |

### GET /workspaces/:workspaceId/documents/:documentId/dag-context
특정 문서 기준 미니 DAG 데이터 (메타 패널·프리뷰 하단용).

**Response** `200`
```json
{
  "document": { "id": "uuid", "title": "001 — 기능 요구사항" },
  "category": { "id": "uuid", "name": "001 Requirements" },
  "prev":    { "id": "uuid", "title": "000 — 프로젝트 개요" },
  "next":    { "id": "uuid", "title": "002 — 컴포넌트 설계" },
  "related": [
    { "id": "uuid", "title": "007 — 아키텍처", "sharedTags": ["architecture"] },
    { "id": "uuid", "title": "008 — 로드맵",   "sharedTags": ["roadmap"] }
  ]
}
```

> **캐싱:** Redis TTL 30초. 문서 링크 변경 시 즉시 무효화.
