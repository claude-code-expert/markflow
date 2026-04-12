---
phase: 01-security-auth-hardening
reviewed: 2026-04-11T13:00:51Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - apps/api/src/index.ts
  - apps/api/src/routes/upload-token.ts
  - apps/api/src/routes/users.ts
  - apps/api/src/services/auth-service.ts
  - apps/api/src/services/graph-service.ts
  - apps/api/src/services/relation-service.ts
  - apps/api/tests/integration/graph.test.ts
  - apps/api/tests/integration/password-change.test.ts
  - apps/api/tests/integration/relations.test.ts
  - apps/web/app/(app)/[workspaceSlug]/settings/page.tsx
  - apps/web/components/__tests__/password-change-modal.test.tsx
  - apps/web/components/password-change-modal.tsx
  - apps/worker/src/helpers.ts
  - apps/worker/src/index.ts
  - apps/worker/tests/worker-logic.test.ts
  - docs/SECURITY.md
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-11T13:00:51Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 01 Security & Auth Hardening 구현을 검토했습니다. R2 Worker CORS/Bearer 인증, 비밀번호 변경 API(PUT /me/password), N+1 제거(graph/relation 서비스), 비밀번호 변경 모달 UI가 포함됩니다.

전반적인 구현 품질은 높습니다. `changePassword`의 트랜잭션 처리, CORS fail-closed 설계, cycle detection의 배치 프리로드 패턴은 모두 올바르게 구현되었습니다. 그러나 보안상 중요한 2가지 문제를 발견했습니다: 업로드 토큰 엔드포인트가 비밀값(shared secret) 자체를 API 응답으로 반환하고 있으며, `avatarUrl` 입력값에 URL 유효성 검사가 없습니다.

---

## Critical Issues

### CR-01: Upload Token 엔드포인트가 R2 Shared Secret을 평문으로 노출

**File:** `apps/api/src/routes/upload-token.ts:34`

**Issue:**
`GET /api/v1/upload-token` 엔드포인트가 `R2_UPLOAD_SECRET` 환경변수 값(Worker와 공유하는 Bearer secret)을 그대로 응답 body에 반환합니다. 이 값은 R2 업로드 Worker의 인증에 사용되는 shared secret으로, 노출 시 누구든지 Worker에 무제한으로 파일을 업로드할 수 있습니다.

인증된 사용자만 접근 가능하지만, 이 설계는 다음 문제를 만듭니다:
1. XSS 공격으로 인해 클라이언트 측 토큰이 탈취될 경우 `R2_UPLOAD_SECRET` 자체가 유출됩니다.
2. 모든 인증된 사용자가 동일한 전용 secret을 공유하므로 revocation이 불가능합니다 (한 번 유출되면 전체 시크릿을 교체해야 합니다).
3. Worker 인증 설계 문서(`SECURITY.md`)는 shared secret 패턴을 인정하지만, API가 이 시크릿을 프론트엔드에 그대로 전달하는 것은 설계 문서에 명시되지 않은 위험입니다.

**Fix:**
두 가지 접근법 중 선택:

**옵션 A (권장): 단기 서명 토큰 발급 — secret 자체는 서버에서만 보유**
```typescript
import crypto from 'node:crypto';

// GET /api/v1/upload-token
app.get('/', async (request, reply) => {
  if (!request.currentUser) throw unauthorized('Not authenticated');

  const uploadSecret = process.env['R2_UPLOAD_SECRET'];
  if (!uploadSecret) {
    return reply.status(200).send({ token: null });
  }

  // HMAC-SHA256으로 user+timestamp 서명 — secret 자체를 노출하지 않음
  const userId = request.currentUser.userId;
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5분 유효
  const payload = `${userId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', uploadSecret)
    .update(payload)
    .digest('hex');
  const token = `${payload}:${signature}`;

  return reply.status(200).send({ token, expiresAt });
});
```
Worker 측에서는 동일 HMAC 재계산으로 검증하고 `expiresAt`을 확인합니다.

**옵션 B (간단한 단기 해결책): 전용 업로드 토큰을 DB에 발급**
```typescript
// 인증된 사용자에게 짧은 유효기간(5분)의 랜덤 토큰을 발급하고
// DB 또는 Redis에 저장. Worker는 API로 토큰 검증.
const uploadToken = crypto.randomUUID();
// store uploadToken with userId, expiresAt
```

---

### CR-02: `avatarUrl` 필드에 URL 유효성 검사 없음

**File:** `apps/api/src/routes/users.ts:91-93`

**Issue:**
`PATCH /api/v1/users/me` 엔드포인트의 `avatarUrl` 필드는 어떤 문자열이든 DB에 저장됩니다. URL 형식 검사, 허용 도메인 검사, `javascript:` URL 차단이 모두 없습니다.

`avatarUrl`은 프로필 카드, 댓글, 멤버 목록 등 다양한 곳에서 `<img src={avatarUrl}>` 형태로 렌더링됩니다. `SECURITY.md`는 Avatar에서 SVG를 거부하는 정책을 문서화하고 있지만, 구현 체크리스트의 첫 항목(`Avatar 업로드 API: image/svg+xml MIME 타입 거부`)이 아직 미완료(`[ ]`) 상태입니다.

현재 상황:
- `avatarUrl: "javascript:alert(1)"` 같은 값도 저장됨
- `avatarUrl: "https://evil.com/tracking-pixel.svg"` (SVG) 도 저장됨
- R2 Worker는 SVG를 허용하지만 이는 문서 이미지용이며 Avatar는 다른 정책임

**Fix:**
```typescript
if (avatarUrl !== undefined) {
  // URL 형식 검사
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(avatarUrl);
  } catch {
    throw badRequest('INVALID_AVATAR_URL', 'avatarUrl must be a valid URL');
  }

  // 프로토콜 허용 목록 (javascript:, data: 차단)
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw badRequest('INVALID_AVATAR_URL', 'avatarUrl must use http or https protocol');
  }

  // SVG 차단 (SECURITY.md 정책 — Avatar 컨텍스트에서 SVG 거부)
  if (avatarUrl.toLowerCase().endsWith('.svg') || avatarUrl.includes('svg')) {
    throw badRequest('INVALID_AVATAR_URL', 'SVG files are not allowed for avatars');
  }

  updates.avatarUrl = avatarUrl;
}
```

---

## Warnings

### WR-01: `detectCycle`이 전체 `next` 관계를 매 호출마다 풀 스캔

**File:** `apps/api/src/services/relation-service.ts:77-82`

**Issue:**
`detectCycle` 함수는 `type='next'`인 모든 `documentRelations` 레코드를 workspace 필터 없이 조회합니다. 문서가 많아질수록 모든 워크스페이스의 next 관계를 불필요하게 로드합니다. 또한 `setRelations`에서 prev와 next 각각에 대해 `detectCycle`을 별도 호출하므로 이 쿼리가 최대 2번 실행됩니다.

이것은 현재 N+1 제거 노력과 모순됩니다 — cycle detection이 새로운 전체 테이블 스캔을 도입합니다.

```typescript
// 현재: workspace 필터 없이 전체 next 관계 로드
const nextRelations = await db
  .select({ sourceId, targetId })
  .from(documentRelations)
  .where(eq(documentRelations.type, 'next')); // 전체 테이블 스캔
```

**Fix:**
`workspaceId`를 `detectCycle`에 전달하고, 해당 workspace의 문서 ID로 필터링:
```typescript
async function detectCycle(
  docId: string,
  targetId: string,
  direction: 'prev' | 'next',
  workspaceId: string, // 추가
): Promise<boolean> {
  // workspace의 문서 ID를 먼저 가져오거나,
  // inArray로 workspaceDocIds 범위 내에서만 조회
  const nextRelations = await db
    .select({ sourceId: documentRelations.sourceId, targetId: documentRelations.targetId })
    .from(documentRelations)
    .innerJoin(documents, eq(documentRelations.sourceId, documents.id))
    .where(
      and(
        eq(documentRelations.type, 'next'),
        eq(documents.workspaceId, Number(workspaceId)),
        eq(documents.isDeleted, false),
      ),
    );
  // ...
}
```

---

### WR-02: `refreshToken`이 응답 body에 중복 노출

**File:** `apps/api/src/routes/users.ts:148-159`

**Issue:**
비밀번호 변경 성공 후 `refreshToken`이 HttpOnly 쿠키로 설정되지만(보안 설계 올바름), 동시에 응답 body에도 평문으로 포함됩니다.

```typescript
// 쿠키로 설정 (올바름)
reply.setCookie('refreshToken', result.refreshToken, { httpOnly: true, ... });

// body에도 함께 노출 (불필요)
return reply.status(200).send({
  accessToken: result.accessToken,
  refreshToken: result.refreshToken, // ← 이것이 문제
});
```

HttpOnly 쿠키의 목적은 JavaScript에서 토큰 접근을 차단하는 것입니다. Body에도 포함하면 XSS 발생 시 해당 응답을 가로채 `refreshToken`을 탈취할 수 있습니다.

`password-change-modal.tsx`는 `response.refreshToken`을 사용하지 않고 `response.accessToken`만 `setAccessToken`에 전달하므로, body의 `refreshToken`은 실제로 소비되지 않습니다.

**Fix:**
```typescript
return reply.status(200).send({
  accessToken: result.accessToken,
  // refreshToken은 HttpOnly 쿠키로만 전달 — body에서 제거
});
```

테스트(`password-change.test.ts:50-57`)도 `body.refreshToken`을 검증하고 있으므로 함께 수정 필요:
```typescript
// 변경 전
expect(body.refreshToken).toBeTruthy();
// 변경 후 — body에는 없고 쿠키에만 있음
const cookieStr = ...;
expect(cookieStr).toContain('refreshToken=');
```

---

### WR-03: `graph-service.ts`에서 workspaceId를 Number()로 변환 시 유효성 검사 없음

**File:** `apps/api/src/services/graph-service.ts:39`

**Issue:**
`workspaceId`가 string으로 수신되어 `Number(workspaceId)`로 변환되지만, 비정수 문자열(`"abc"`, `"1.5"`)이 들어오면 `NaN`이 쿼리에 전달됩니다. Drizzle ORM이 `NaN`을 어떻게 처리하는지에 따라 예상치 못한 결과가 발생할 수 있습니다.

```typescript
.where(
  and(
    eq(documents.workspaceId, Number(workspaceId)), // NaN 위험
    eq(documents.isDeleted, false),
  ),
)
```

같은 패턴이 `relation-service.ts:45`, `relation-service.ts:127`에도 존재합니다.

**Fix:**
```typescript
const numWorkspaceId = parseInt(workspaceId, 10);
if (isNaN(numWorkspaceId) || numWorkspaceId <= 0) {
  throw badRequest('INVALID_WORKSPACE_ID', 'workspaceId must be a positive integer');
}
```
또는 라우트 레벨에서 JSON Schema로 path parameter를 `integer` 타입으로 강제합니다.

---

### WR-04: `settings/page.tsx`에서 `console.error` 직접 사용 (프로젝트 규칙 위반)

**File:** `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx:394`

**Issue:**
프로젝트 규칙(`CLAUDE.md`)에서 `console.log` 직접 사용을 금지하고 logger 유틸 사용을 의무화하고 있습니다. `console.error`도 동일한 규칙에 해당합니다.

```typescript
} else if (err instanceof Error) {
  console.error('Settings save error:', err); // ← 규칙 위반
  setError(err.message);
}
```

**Fix:**
프론트엔드 logger 유틸이 있다면 사용하고, 없다면 해당 줄 제거 (에러는 이미 `setError(err.message)`로 사용자에게 표시됨):
```typescript
} else if (err instanceof Error) {
  // console.error 제거 — err.message는 setError로 처리됨
  setError(err.message);
}
```

---

## Info

### IN-01: `upload-token.ts` 주석이 설계 위험을 충분히 설명하지 않음

**File:** `apps/api/src/routes/upload-token.ts:28-31`

**Issue:**
주석이 `R2_UPLOAD_SECRET not configured` 경우에 대해 "D-05 backward compat"라고만 언급하고 있습니다. 현재 구현에서 설정된 경우에 secret을 직접 반환하는 것이 의도적인 설계 결정인지, 보안 위험을 인지하고 있는지가 명확하지 않습니다.

**Fix:**
CR-01이 해결되면 해결됨. 그 전까지는 위험성을 주석에 명시:
```typescript
// TODO(security): R2_UPLOAD_SECRET을 직접 반환하는 방식은 비밀값 노출 위험이 있음.
// 단기 HMAC 서명 토큰 방식으로 교체 필요 (CR-01 참조).
```

---

### IN-02: `password-change-modal.tsx`의 `countdownBadge`가 빈 div 렌더링

**File:** `apps/web/components/password-change-modal.tsx:369-371`

**Issue:**
`ACCOUNT_LOCKED` 상태에서 `countdownBadge` div가 렌더링되지만 콘텐츠가 없습니다. 실제 카운트다운은 구현되지 않았고 placeholder만 존재합니다.

```typescript
{apiError.code === 'ACCOUNT_LOCKED' && (
  <div style={styles.countdownBadge} /> // 빈 div
)}
```

**Fix:**
카운트다운 기능을 구현하거나, 계획이 없다면 해당 div를 제거합니다:
```typescript
// 빈 div 제거 — 잠금 시간은 이미 apiError.message에 포함됨
```

---

### IN-03: `graph-service.ts`에서 `rel.type` 타입 단언 필요

**File:** `apps/api/src/services/graph-service.ts:74`

**Issue:**
DB에서 가져온 `rel.type`을 `as 'prev' | 'next' | 'related'`로 단언합니다. DB 스키마와 런타임 값이 항상 일치한다고 가정하는 것으로, DB에 다른 값이 있을 경우 타입 가드 없이 통과됩니다.

```typescript
type: rel.type as 'prev' | 'next' | 'related', // 타입 단언
```

**Fix:**
타입 가드로 유효성 검사 추가:
```typescript
const VALID_TYPES = new Set(['prev', 'next', 'related'] as const);
type RelationType = 'prev' | 'next' | 'related';

function isValidRelationType(t: string): t is RelationType {
  return VALID_TYPES.has(t as RelationType);
}

// 사용 시
const type = rel.type;
if (!isValidRelationType(type)) {
  // 로그 후 skip하거나 에러 처리
  continue;
}
edges.push({ source: rel.sourceId, target: rel.targetId, type });
```

---

_Reviewed: 2026-04-11T13:00:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
