# Phase 2: Test Coverage - Research

**Researched:** 2026-04-13
**Domain:** Vitest integration/unit testing for Fastify API + client-side utilities
**Confidence:** HIGH

## Summary

Phase 2는 댓글 CRUD 통합 테스트(7개 시나리오)와 이미지 업로드 클라이언트 검증 테스트(5개 시나리오)를 작성하는 순수 테스트 작성 페이즈이다. 새로운 라이브러리 도입은 불필요하며, 기존 테스트 인프라(Vitest + `app.inject()` + setup.ts/factory.ts)를 그대로 활용한다.

핵심 작업은 (1) factory.ts에 `createDocument()`, `createComment()` 헬퍼 추가, (2) `comments.test.ts` 작성 (7개 시나리오), (3) editor 패키지에 vitest 설정 추가 및 `imageValidation.test.ts` + `cloudflareUploader.test.ts` 작성 (5개 시나리오)이다.

**Primary recommendation:** 기존 통합 테스트 패턴(T027 auth-login.test.ts)을 그대로 따르되, factory.ts를 확장하여 테스트 setup 코드를 간결하게 유지하라. editor 패키지에 vitest.config.ts와 test 스크립트를 추가해야 `pnpm test`에 포함된다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 클라이언트 검증 로직만 단위 테스트 -- R2 Worker 직접 테스트나 API 엔드포인트 테스트 제외. validateImageFile(), cloudflareUploader 등 클라이언트 유틸리티 함수 대상.
- **D-02:** 5개 시나리오 전부 커버 -- 타입 검증/크기 제한/CORS/성공 업로드/에러 처리. CORS와 성공 업로드는 fetch mock으로 cloudflareUploader의 응답 처리 로직을 검증.
- **D-03:** 단일 파일 `comments.test.ts`에 describe 블록으로 7개 시나리오 그룹화 -- 기존 통합 테스트 패턴(auth-login.test.ts 등)과 동일.
- **D-04:** 권한 검증은 '권한' 시나리오에 포함 -- viewer/editor/admin 역할별 접근 제어를 댓글 테스트 내 권한 describe 블록에서 검증. 별도 보안 테스트 파일 불필요.
- **D-05:** factory.ts 확장 -- createComment(), createDocument() 등 헬퍼 함수 추가. 기존 createUser() 패턴을 따라서 테스트 코드 간결화.
- **D-06:** 기존 DB 격리 패턴 유지 -- setup.ts의 beforeAll/afterAll로 DB 초기화. 기존 30+개 테스트와 동일한 방식으로 일관성 유지.
- **D-07:** 시나리오 통과만 기준 -- TEST-01 7개, TEST-02 5개 시나리오 전부 통과를 성공 기준으로. 코드 커버리지 % 수치 게이트는 설정하지 않음.

### Claude's Discretion
- 댓글 테스트 내 각 시나리오의 구체적 assertion 설계
- fetch mock 구현 방식 (vitest mock vs msw)
- factory 함수의 매개변수 설계 및 기본값
- 테스트 데이터의 구체적 값 (이메일, 문서 내용 등)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | 댓글 CRUD 통합 테스트가 생성/조회/수정/삭제/해결/권한/스레딩을 검증한다 | comments.ts 라우트 분석 완료, comment-service.ts 로직 확인, RBAC 미들웨어 역할 계층 확인 (viewer<editor<admin<owner), factory 확장 패턴 확립 |
| TEST-02 | 이미지 업로드 테스트가 타입 검증/크기 제한/CORS/성공 업로드/에러 처리를 검증한다 | imageValidation.ts와 cloudflareUploader.ts 코드 분석 완료, editor 패키지 vitest 설정 부재 확인, fetch mock 전략 수립 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- TypeScript strict mode, `any` 금지
- 테스트 먼저: 새 기능 구현 시 테스트 코드 먼저 작성 (TDD)
- Conventional Commits
- `console.log` 직접 사용 금지 (logger 유틸 사용)
- 테스트 없이 기능 구현 완료 처리 금지
- `.claude/rules/testing.md`: describe 블록으로 기능 그룹화, 테스트 데이터 팩토리 사용

## Standard Stack

### Core (No New Dependencies)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| vitest | (devDep in api) | 테스트 프레임워크 | 이미 설치됨 [VERIFIED: apps/api/vitest.config.ts] |
| fastify | ^5.3.0 | API 서버 + `app.inject()` 테스트 | 이미 설치됨 [VERIFIED: apps/api/package.json] |
| @markflow/db | workspace:* | DB 스키마 + Drizzle ORM | 이미 설치됨 [VERIFIED: apps/api/package.json] |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest `vi.fn()` / `vi.stubGlobal()` | built-in | fetch mock for cloudflareUploader | 이미지 업로드 테스트 시 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vitest `vi.stubGlobal('fetch', ...)` | msw (Mock Service Worker) | msw는 더 정교하지만 새 의존성 추가 필요. 단순 fetch mock에는 vitest 내장으로 충분 |

**Recommendation (Claude's Discretion):** `vi.stubGlobal('fetch', vi.fn(...))` 사용. cloudflareUploader는 단일 fetch 호출만 하므로 msw의 복잡성이 불필요하다. [ASSUMED]

**Installation:** 새 패키지 설치 불필요. editor 패키지에 vitest devDependency 추가만 필요.

```bash
pnpm --filter @markflow/editor add -D vitest
```

## Architecture Patterns

### 댓글 통합 테스트 구조

```
apps/api/tests/
├── helpers/
│   ├── setup.ts          ← 기존 (변경 없음)
│   └── factory.ts        ← createDocument(), createComment() 추가
└── integration/
    └── comments.test.ts  ← 새 파일 (T127)
```

**Pattern: 기존 통합 테스트 패턴 재사용** [VERIFIED: auth-login.test.ts, documents.test.ts]

```typescript
// Source: apps/api/tests/integration/auth-login.test.ts (기존 패턴)
import { describe, it, expect } from 'vitest';
import { getApp, getDb } from '../helpers/setup.js';
import { createUser, createWorkspace, createDocument, createComment } from '../helpers/factory.js';

describe('POST /api/v1/workspaces/:wsId/documents/:docId/comments', () => {
  it('should create a comment and return 201', async () => {
    const app = getApp();
    const db = getDb();
    const { user, accessToken } = await createUser(db);
    const ws = await createWorkspace(db, user.id);
    // createDocument는 app.inject() 통해 API 호출
    const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}/comments`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { content: 'Test comment' },
    });

    expect(res.statusCode).toBe(201);
  });
});
```

### 이미지 테스트 구조

```
packages/editor/
├── vitest.config.ts              ← 새 파일 (editor 테스트 활성화)
└── src/utils/__tests__/
    ├── markdownActions.test.ts   ← 기존
    ├── wordCount.test.ts         ← 기존
    ├── imageValidation.test.ts   ← 새 파일
    └── cloudflareUploader.test.ts ← 새 파일
```

### Factory 확장 패턴

```typescript
// Source: 기존 factory.ts의 createUser() 패턴을 따름 [VERIFIED: factory.ts]

// createDocument: API 엔드포인트 호출 방식 (기존 graph.test.ts 로컬 헬퍼와 동일)
export async function createDocument(
  app: FastifyInstance,
  wsId: number,
  accessToken: string,
  title?: string,
) {
  const id = nextId();
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${wsId}/documents`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { title: title ?? `Test Document ${id}` },
  });
  const doc = (res.json() as { document: { id: number; title: string } }).document;
  return doc;
}

// createComment: DB 직접 삽입 방식 (setup 속도 최적화)
export async function createComment(
  db: Db,
  documentId: number,
  authorId: number,
  options?: { content?: string; parentId?: number },
) {
  const [comment] = await db.insert(comments).values({
    documentId,
    authorId,
    content: options?.content ?? 'Test comment',
    parentId: options?.parentId ?? null,
  }).returning();
  return comment!;
}
```

### Anti-Patterns to Avoid
- **createDocument를 DB 직접 삽입으로 구현하지 말것:** documents 테이블에 직접 삽입하면 slug 생성, version 초기화 등 API 라우트의 비즈니스 로직을 우회한다. `app.inject()` 방식이 실제 동작을 검증한다. [VERIFIED: graph.test.ts 패턴]
- **모든 테스트에서 user/workspace/document를 반복 생성하지 말것:** describe 블록 내에서 공유할 수 있는 데이터는 describe-level 변수로 선언하고, 각 it 블록에서 필요한 부분만 추가 생성한다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP 요청 시뮬레이션 | 실제 HTTP 클라이언트 | `app.inject()` | Fastify 내장, 네트워크 없이 직접 라우트 호출 [VERIFIED: 기존 30+ 테스트] |
| fetch mock | 수동 global.fetch 교체 | `vi.stubGlobal('fetch', ...)` | vitest 내장, 자동 복원 지원 |
| DB 정리 | 수동 DELETE 쿼리 | setup.ts의 TRUNCATE CASCADE | 기존 패턴, FK 순서 관리됨 [VERIFIED: setup.ts] |
| 테스트 데이터 생성 | 각 테스트에서 수동 | factory.ts 헬퍼 | 코드 중복 제거, 일관된 기본값 [VERIFIED: factory.ts] |

## Common Pitfalls

### Pitfall 1: createDocument가 factory.ts에 없어서 중복 구현
**What goes wrong:** 현재 createDocument는 graph.test.ts, relations.test.ts, circular-ref.test.ts 등에서 각각 로컬 함수로 중복 정의되어 있다. [VERIFIED: grep 결과 3개 파일에서 동일 함수]
**Why it happens:** factory.ts에 아직 추가되지 않았기 때문이다.
**How to avoid:** factory.ts에 공유 createDocument()를 추가하고, comments.test.ts는 이를 import한다. 기존 중복 파일은 이 페이즈에서 리팩터링하지 않는다 (scope 밖).
**Warning signs:** factory.ts import에서 createDocument가 없다는 TypeScript 에러.

### Pitfall 2: editor 패키지에 vitest가 설정되어 있지 않음
**What goes wrong:** `pnpm test`가 turbo를 통해 각 패키지의 `test` 스크립트를 실행하는데, editor 패키지에는 `test` 스크립트가 없어서 테스트가 CI에서 실행되지 않는다. [VERIFIED: packages/editor/package.json에 test 스크립트 없음]
**Why it happens:** 기존 editor 테스트(markdownActions.test.ts, wordCount.test.ts)가 수동으로만 실행되었기 때문이다.
**How to avoid:** (1) `vitest` devDependency 추가, (2) `vitest.config.ts` 생성, (3) package.json에 `"test": "vitest run"` 스크립트 추가.
**Warning signs:** `pnpm --filter @markflow/editor test`가 "missing script: test" 에러.

### Pitfall 3: 댓글 라우트의 wsId 파라미터 매핑
**What goes wrong:** 댓글 라우트 URL은 `/workspaces/:wsId/documents/:docId/comments`인데, RBAC 미들웨어(rbac.ts)는 `params.workspaceId ?? params.wsId ?? params.id`로 워크스페이스 ID를 찾는다. [VERIFIED: rbac.ts line 23-25]
**Why it happens:** 라우트마다 파라미터 이름이 다르다 (wsId vs workspaceId).
**How to avoid:** 테스트에서 URL을 올바르게 구성하면 문제 없음. wsId가 URL에 포함되면 RBAC가 자동으로 인식한다.

### Pitfall 4: 댓글 수정/삭제 시 작성자만 가능
**What goes wrong:** comment-service.ts의 update()와 remove()는 `comment.authorId !== Number(userId)` 검증이 있다. [VERIFIED: comment-service.ts line 168, 304] admin이나 owner도 다른 사용자의 댓글을 수정/삭제할 수 없다.
**Why it happens:** 의도적 설계 -- 댓글은 작성자만 수정/삭제 가능.
**How to avoid:** 권한 테스트 시나리오에서 이 동작을 명시적으로 검증해야 한다 (editor role 아닌 다른 사용자가 403 받는 케이스).

### Pitfall 5: cloudflareUploader의 File/FormData/fetch 의존성
**What goes wrong:** `createCloudflareUploader`는 브라우저 API(File, FormData, fetch)에 의존한다. Node.js 테스트 환경에서 이들이 없을 수 있다.
**Why it happens:** editor 패키지는 브라우저용 라이브러리이다.
**How to avoid:** Node.js 18+에는 fetch, FormData가 내장되어 있다. File은 Node.js 20+에서 내장. `vi.stubGlobal`로 fetch를 mock하면 실제 네트워크 호출 없이 테스트 가능. `createTestImage()` 헬퍼가 이미 존재한다. [VERIFIED: cloudflareUploader.ts line 50-60]

### Pitfall 6: resolved 토글은 PATCH의 resolved 필드
**What goes wrong:** 댓글 해결(resolve)은 별도 엔드포인트가 아니라 `PATCH .../comments/:commentId`에 `{ resolved: true }`를 보내는 방식이다. [VERIFIED: comments.ts line 66-94]
**Why it happens:** content 수정과 resolved 토글이 같은 PATCH 엔드포인트를 공유한다.
**How to avoid:** 해결 테스트 시나리오에서 `{ resolved: true }` payload를 사용. content와 resolved를 동시에 보내면 content 수정이 우선 처리된다.

## Code Examples

### 댓글 생성 테스트 패턴

```typescript
// Source: comments.ts 라우트 분석 + auth-login.test.ts 패턴 [VERIFIED]
it('should create a comment and return 201', async () => {
  const app = getApp();
  const db = getDb();
  const { user, accessToken } = await createUser(db);
  const ws = await createWorkspace(db, user.id);
  const doc = await createDocument(app, ws.id, accessToken, 'Test Doc');

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}/comments`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { content: 'This is a test comment' },
  });

  expect(res.statusCode).toBe(201);
  const body = res.json() as { comment: { id: number; content: string; authorId: number } };
  expect(body.comment.content).toBe('This is a test comment');
  expect(body.comment.authorId).toBe(user.id);
});
```

### 스레딩(대댓글) 테스트 패턴

```typescript
// Source: comment-service.ts create() parentId 처리 [VERIFIED]
it('should create a threaded reply with parentId', async () => {
  // ... setup ...
  const parentRes = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}/comments`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { content: 'Parent comment' },
  });
  const parent = (parentRes.json() as { comment: { id: number } }).comment;

  const replyRes = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}/comments`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { content: 'Reply', parentId: parent.id },
  });

  expect(replyRes.statusCode).toBe(201);
  const reply = (replyRes.json() as { comment: { parentId: number } }).comment;
  expect(reply.parentId).toBe(parent.id);
});
```

### 권한 검증 테스트 패턴 (viewer가 댓글 생성 거부됨)

```typescript
// Source: rbac.ts ROLE_HIERARCHY + comments.ts requireRole('editor') [VERIFIED]
it('should return 403 for viewer trying to create a comment', async () => {
  const app = getApp();
  const db = getDb();
  const { user: owner, accessToken: ownerToken } = await createUser(db);
  const ws = await createWorkspace(db, owner.id);
  const doc = await createDocument(app, ws.id, ownerToken, 'Test Doc');

  const { user: viewer, accessToken: viewerToken } = await createUser(db);
  await addMember(db, ws.id, viewer.id, 'viewer');

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/workspaces/${ws.id}/documents/${doc.id}/comments`,
    headers: { authorization: `Bearer ${viewerToken}` },
    payload: { content: 'Viewer comment' },
  });

  expect(res.statusCode).toBe(403);
});
```

### imageValidation 단위 테스트 패턴

```typescript
// Source: imageValidation.ts [VERIFIED]
import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../imageValidation';

describe('validateImageFile', () => {
  it('should accept valid PNG file', () => {
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateImageFile(file)).toEqual({ valid: true });
  });

  it('should reject unsupported file type', () => {
    const file = new File(['data'], 'test.exe', { type: 'application/x-msdownload' });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('지원하지 않는 파일 형식');
  });

  it('should reject file exceeding 10MB', () => {
    const file = new File(['data'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('파일 크기가 너무 큽니다');
  });
});
```

### cloudflareUploader fetch mock 패턴

```typescript
// Source: cloudflareUploader.ts [VERIFIED]
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCloudflareUploader, createTestImage } from '../cloudflareUploader';

describe('createCloudflareUploader', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should upload successfully and return URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, url: 'https://r2.example.com/img.png' }),
    });

    const upload = createCloudflareUploader('https://worker.example.com');
    const file = createTestImage();
    const url = await upload(file);

    expect(url).toBe('https://r2.example.com/img.png');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://worker.example.com/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should throw on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      text: () => Promise.resolve('File too large'),
    });

    const upload = createCloudflareUploader('https://worker.example.com');
    await expect(upload(createTestImage())).rejects.toThrow('Upload failed (413)');
  });
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (bundled with apps/api, to be added to packages/editor) |
| Config file (API) | `apps/api/vitest.config.ts` |
| Config file (Editor) | `packages/editor/vitest.config.ts` (Wave 0에서 생성) |
| Quick run command (API) | `pnpm --filter @markflow/api test -- tests/integration/comments.test.ts` |
| Quick run command (Editor) | `pnpm --filter @markflow/editor test -- src/utils/__tests__/imageValidation.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01-a | 댓글 생성 (201 + content/authorId 검증) | integration | `pnpm --filter @markflow/api test -- tests/integration/comments.test.ts -t "create"` | Wave 0 |
| TEST-01-b | 댓글 조회 (200 + comments 배열, authorName 포함) | integration | 동일 파일 `-t "list"` | Wave 0 |
| TEST-01-c | 댓글 수정 (200 + updated content) | integration | 동일 파일 `-t "update"` | Wave 0 |
| TEST-01-d | 댓글 삭제 (204 + DB 확인) | integration | 동일 파일 `-t "delete"` | Wave 0 |
| TEST-01-e | 댓글 해결 (resolved toggle) | integration | 동일 파일 `-t "resolve"` | Wave 0 |
| TEST-01-f | 권한 (viewer 생성 거부, 타인 수정/삭제 거부) | integration | 동일 파일 `-t "permission"` | Wave 0 |
| TEST-01-g | 스레딩 (parentId 대댓글) | integration | 동일 파일 `-t "thread"` | Wave 0 |
| TEST-02-a | 타입 검증 (허용/거부 MIME 타입) | unit | `pnpm --filter @markflow/editor test -- src/utils/__tests__/imageValidation.test.ts` | Wave 0 |
| TEST-02-b | 크기 제한 (10MB 초과 거부) | unit | 동일 파일 | Wave 0 |
| TEST-02-c | CORS (fetch mock 응답 처리) | unit | `pnpm --filter @markflow/editor test -- src/utils/__tests__/cloudflareUploader.test.ts` | Wave 0 |
| TEST-02-d | 성공 업로드 (URL 반환) | unit | 동일 파일 | Wave 0 |
| TEST-02-e | 에러 처리 (non-ok 응답, 네트워크 에러) | unit | 동일 파일 | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @markflow/api test -- tests/integration/comments.test.ts` 또는 `pnpm --filter @markflow/editor test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/editor/vitest.config.ts` -- editor 패키지 vitest 설정 파일
- [ ] `packages/editor/package.json` -- `"test": "vitest run"` 스크립트 추가
- [ ] `pnpm --filter @markflow/editor add -D vitest` -- vitest devDependency
- [ ] `apps/api/tests/helpers/factory.ts` -- `createDocument()`, `createComment()` 헬퍼 추가
- [ ] `apps/api/tests/integration/comments.test.ts` -- TEST-01 전체
- [ ] `packages/editor/src/utils/__tests__/imageValidation.test.ts` -- TEST-02-a, TEST-02-b
- [ ] `packages/editor/src/utils/__tests__/cloudflareUploader.test.ts` -- TEST-02-c, TEST-02-d, TEST-02-e

## 7개 댓글 시나리오 상세 매핑

| # | 시나리오 | HTTP Method | Endpoint | 핵심 검증 |
|---|---------|-------------|----------|-----------|
| 1 | 생성 | POST | `/:wsId/documents/:docId/comments` | 201, content/authorId/authorName 반환 |
| 2 | 조회 | GET | `/:wsId/documents/:docId/comments` | 200, comments 배열, createdAt 오름차순 |
| 3 | 수정 | PATCH | `/:wsId/documents/:docId/comments/:commentId` | 200, updated content, updatedAt 변경 |
| 4 | 삭제 | DELETE | `/:wsId/documents/:docId/comments/:commentId` | 204, DB에서 삭제 확인 |
| 5 | 해결 | PATCH | `/:wsId/documents/:docId/comments/:commentId` | resolved=true, resolvedBy 설정 |
| 6 | 권한 | POST/PATCH/DELETE | 동일 | viewer 403, 타인 수정/삭제 403 |
| 7 | 스레딩 | POST | 동일 | parentId 지정, 대댓글 생성 확인 |

[VERIFIED: comments.ts 라우트 + comment-service.ts 로직]

## 5개 이미지 시나리오 상세 매핑

| # | 시나리오 | 대상 함수 | 핵심 검증 |
|---|---------|----------|-----------|
| 1 | 타입 검증 | validateImageFile() | png/jpeg/gif/webp/svg 허용, 기타 거부 |
| 2 | 크기 제한 | validateImageFile() | 10MB 초과 거부, 0 byte 거부 |
| 3 | CORS | createCloudflareUploader() | fetch mock으로 CORS 에러 시나리오 (TypeError 등) |
| 4 | 성공 업로드 | createCloudflareUploader() | fetch mock 성공 응답 -> URL 반환 |
| 5 | 에러 처리 | createCloudflareUploader() | non-ok 응답, invalid JSON, network 에러 |

[VERIFIED: imageValidation.ts + cloudflareUploader.ts]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vitest vi.stubGlobal이 msw보다 이 케이스에 적합 | Standard Stack | 낮음 -- 둘 다 동작하며, 팀 선호가 다를 수 있음 |
| A2 | Node.js 20+에서 File API가 global로 사용 가능 | Pitfall 5 | 중간 -- Node 18이면 File polyfill 필요. createTestImage()가 이미 File 사용 중이므로 기존 환경에서 동작 확인 필요 |
| A3 | editor 패키지 vitest.config.ts는 별도 설정 없이 기본값으로 충분 | Wave 0 Gaps | 낮음 -- 기존 editor 테스트가 이미 vitest import 사용 중 |

## Open Questions

1. **editor 패키지의 기존 테스트가 현재 CI에서 실행되는지?**
   - What we know: `packages/editor/package.json`에 `test` 스크립트가 없다. `turbo test`는 `test` 스크립트가 있는 패키지만 실행한다.
   - What's unclear: 기존 markdownActions.test.ts, wordCount.test.ts가 어디서 실행되는지 (수동? 다른 경로?)
   - Recommendation: vitest 설정 추가 시 기존 테스트도 포함되도록 하면 자연스럽게 해결.

2. **Node.js 버전과 File API 가용성**
   - What we know: `createTestImage()`가 `new File(...)` 사용. Node.js 20+에서 File이 global.
   - What's unclear: 프로젝트의 Node.js 최소 버전.
   - Recommendation: `node --version`으로 확인. 18이면 vitest의 환경 설정으로 해결 가능.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | authMiddleware (기존) -- 테스트에서 Bearer 토큰 검증 |
| V4 Access Control | yes | requireRole('editor'/'viewer') -- 역할별 접근 제어 테스트 |
| V5 Input Validation | yes | content 길이 제한 5000자, 빈 content 거부 -- 테스트에서 검증 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation | 테스트 포함 여부 |
|---------|--------|---------------------|-----------------|
| 인증 없이 댓글 작성 | Spoofing | authMiddleware | 권한 시나리오에 포함 |
| viewer가 댓글 작성 | Elevation of Privilege | requireRole('editor') | 권한 시나리오에 포함 |
| 타인 댓글 수정/삭제 | Tampering | authorId 검증 | 권한 시나리오에 포함 |
| content 초과 입력 | Denial of Service | 5000자 제한 | 생성 시나리오 edge case로 포함 가능 |

## Sources

### Primary (HIGH confidence)
- `apps/api/tests/helpers/setup.ts` -- DB 초기화 패턴, getApp()/getDb()
- `apps/api/tests/helpers/factory.ts` -- createUser(), createWorkspace() 패턴
- `apps/api/tests/integration/auth-login.test.ts` -- 통합 테스트 구조 참고 (T027)
- `apps/api/src/routes/comments.ts` -- 댓글 라우트 4개 엔드포인트
- `apps/api/src/services/comment-service.ts` -- 댓글 비즈니스 로직 5개 함수
- `apps/api/src/middleware/rbac.ts` -- 역할 계층 (owner>admin>editor>viewer)
- `packages/editor/src/utils/imageValidation.ts` -- validateImageFile() 로직
- `packages/editor/src/utils/cloudflareUploader.ts` -- createCloudflareUploader() + createTestImage()
- `packages/db/src/schema/comments.ts` -- 댓글 테이블 스키마
- `apps/api/vitest.config.ts` -- API 테스트 설정 (fileParallelism: false, timeout: 15s)

### Secondary (MEDIUM confidence)
- `apps/api/tests/integration/graph.test.ts` -- createDocument 로컬 헬퍼 패턴 참고

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 새 라이브러리 없음, 기존 인프라 그대로 사용
- Architecture: HIGH -- 기존 30+ 테스트 파일의 패턴을 그대로 따름
- Pitfalls: HIGH -- 코드를 직접 읽고 확인한 엣지 케이스

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (안정적 -- 테스트 인프라 변경 가능성 낮음)
