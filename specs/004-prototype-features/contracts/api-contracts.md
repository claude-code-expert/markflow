# API Contracts: Prototype-Based Feature Completion

**Date**: 2026-03-27 | **Branch**: `004-prototype-features`

All endpoints use base URL `/api/v1`. Auth via `Authorization: Bearer <accessToken>`.

## New Endpoints

### 1. Public Workspace Search (US3)

```
GET /workspaces/public?q={query}&page={1}&limit={20}
Auth: Required (any authenticated user)
```

**Response 200**:
```json
{
  "workspaces": [
    {
      "id": "uuid",
      "name": "Acme Corp Docs",
      "slug": "acme-corp",
      "memberCount": 12,
      "isPublic": true,
      "pendingRequest": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Notes**:
- `pendingRequest`: true if the requesting user already has a pending join request
- Only returns workspaces where `isPublic = true` AND user is NOT already a member

---

### 2. CSS Theme (US5)

```
GET /workspaces/:id/theme
Auth: Viewer+
```

**Response 200**:
```json
{
  "preset": "default",
  "css": "--mf-font-body: 'DM Sans', sans-serif;\n--mf-color-heading: #1a1916;"
}
```

```
PATCH /workspaces/:id/theme
Auth: Admin+
```

**Request Body**:
```json
{
  "preset": "github",
  "css": "--mf-font-body: -apple-system, sans-serif;"
}
```

**Response 200**:
```json
{
  "preset": "github",
  "css": "--mf-font-body: -apple-system, sans-serif;"
}
```

**Validation**:
- `preset` must be one of: `default`, `github`, `notion`, `dark`, `academic`
- `css` must contain only `--mf-*` custom properties
- `css` max length: 10,000 chars
- Invalid CSS properties return 400 with list of rejected properties

**Error 400** (invalid CSS):
```json
{
  "error": {
    "code": "INVALID_CSS",
    "message": "CSS contains disallowed properties",
    "details": { "rejected": ["background-image", "position"] }
  }
}
```

---

### 3. Embed Tokens (US7)

```
POST /workspaces/:id/embed-tokens
Auth: Admin+
```

**Request Body**:
```json
{
  "label": "외부 블로그 임베드",
  "scope": "read",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "label": "외부 블로그 임베드",
  "token": "mf_gt_a1b2c3d4e5f6...",
  "scope": "read",
  "expiresAt": "2026-12-31T23:59:59Z",
  "createdAt": "2026-03-27T12:00:00Z"
}
```

**Notes**: `token` is returned ONLY on creation. Subsequent GET requests show masked version.

```
GET /workspaces/:id/embed-tokens
Auth: Admin+
```

**Response 200**:
```json
{
  "tokens": [
    {
      "id": "uuid",
      "label": "외부 블로그 임베드",
      "tokenPreview": "mf_gt_a1b2...••••",
      "scope": "read",
      "expiresAt": "2026-12-31T23:59:59Z",
      "createdAt": "2026-03-27T12:00:00Z",
      "isActive": true
    }
  ]
}
```

```
DELETE /workspaces/:id/embed-tokens/:tokenId
Auth: Admin+
```

**Response 204**: No Content

---

## Existing Endpoints (No Changes Required)

| Endpoint | US | Notes |
|----------|-----|-------|
| `GET /documents?q=&categoryId=&sort=&order=&page=&limit=` | US2 | 검색 모달에서 재활용 |
| `POST /workspaces/:id/join-requests` | US3 | 가입 신청 전송 |
| `GET /workspaces/:id/join-requests?status=` | US3/US8 | 신청 목록 조회 |
| `PATCH /workspaces/:id/join-requests/:reqId` | US3/US8 | 승인/거절 |
| `GET /workspaces/:wsId/graph` | US4 | DAG 데이터 |
| `POST /workspaces/:wsId/import` | US6 | MD/ZIP 가져오기 |
| `GET /workspaces/:wsId/documents/:docId/export` | US6 | MD 내보내기 |
| `GET /workspaces/:wsId/categories/:catId/export` | US6 | ZIP 내보내기 |
| `GET /workspaces/:wsId/invitations` | US8 | 초대 목록 |
| `PUT /documents/:docId/relations` | US9 | 문서 링크 저장 |
| `GET /documents/:docId/relations` | US9 | 문서 링크 조회 |
| `GET /documents/:docId/versions` | US11 | 버전 목록 + content |

## Frontend-Only Features (No API Required)

| Feature | US | Implementation |
|---------|-----|---------------|
| Landing Page | US1 | 정적 페이지, API 호출 없음 |
| Search Modal | US2 | 기존 `GET /documents?q=` 재활용 |
| Toast System | US10 | Zustand 스토어, 서버 통신 없음 |
| Version Diff | US11 | 클라이언트 사이드 텍스트 비교 (diff 라이브러리) |
| Word Count | - | 에디터 패키지 내부 계산 |
| Cursor Position | - | CodeMirror EditorState에서 추출 |
