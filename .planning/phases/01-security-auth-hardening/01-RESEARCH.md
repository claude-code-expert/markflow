# Phase 01: Security & Auth Hardening - Research

**Researched:** 2026-04-11
**Domain:** API security, authentication, query optimization, Cloudflare Workers
**Confidence:** HIGH

## Summary

Phase 1은 여섯 가지 요구사항(AUTH-01, SEC-01~05)을 다루며, 네 가지 기술 영역에 걸친다: (1) R2 Worker CORS/인증 강화, (2) 비밀번호 변경 API + 세션 관리, (3) graph/relation 서비스 쿼리 최적화, (4) SVG 보안 문서화. 모든 영역에서 기존 코드베이스의 패턴과 유틸리티를 재사용할 수 있어 신규 의존성이 전혀 필요 없다.

핵심 기술적 과제는 (a) 비밀번호 변경 시 전체 세션 무효화와 새 토큰 발급의 atomic 처리, (b) graph-service의 전체 테이블 스캔을 `inArray` 또는 `innerJoin`으로 교체, (c) relation-service의 N+1을 단일 JOIN 쿼리로 해결, (d) detectCycle()의 DFS 루프 쿼리를 배치 조회 또는 CTE로 최적화하는 것이다.

**Primary recommendation:** 기존 코드베이스의 패턴(Fastify 라우트, Drizzle ORM JOIN, bcryptjs, JWT)을 일관되게 따르고, 신규 라이브러리 없이 모든 요구사항을 구현한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 비밀번호 변경 성공 시 **전체 세션 무효화** -- 현재 세션만 유지하고 다른 기기의 모든 refresh token을 무효화한다. 계정 탈취 시 공격자 세션을 즉시 차단하기 위함.
- **D-02:** 비밀번호 변경 실패 시 **로그인 정책 동일 적용** -- 5회 실패 시 15분 잠금. 기존 rate-limit 로직을 재사용하여 일관성 유지.
- **D-03:** 변경 성공 응답에 **새 access + refresh token 포함** -- 전체 세션 무효화 후에도 클라이언트가 별도 재로그인 없이 계속 사용 가능.
- **D-04:** CORS **즉시 strict 전환** -- ALLOWED_ORIGINS 환경변수에 프로덕션/로컬 도메인만 설정하고 기본값 `*`을 제거한다. 내부 프로젝트이므로 점진적 전환 불필요.
- **D-05:** API_SECRET 미설정 시 **인증 검사 스킵** (기존 결정 유지) -- 로컬 개발 환경에서 .dev.vars 없이도 Worker가 작동하도록 하위 호환 유지.
- **D-06:** 업로드 토큰은 **API 서버에서 발급** -- API 서버에 업로드용 임시 토큰 발급 엔드포인트를 추가하고, 프론트엔드가 토큰을 받아 Worker에 Authorization Bearer 헤더로 전달. Worker는 API_SECRET과 비교 검증.
- **D-07:** 쿼리 최적화 시 API **응답 확장 허용** -- 기존 필드를 유지하면서 JOIN으로 가져온 추가 데이터를 응답에 포함 가능.
- **D-08:** relation-service **detectCycle() N+1도 함께 수정** -- getRelations()와 detectCycle() 모두 배치 쿼리/JOIN으로 변경.
- **D-09:** SECURITY.md에 **규칙 + 근거** 형태로 문서화 -- Avatar(SVG 거부)/Editor(SVG 허용) 분리 규칙과 근거를 기록.

### Claude's Discretion
- graph-service 쿼리 최적화 접근 방식 (JOIN vs subquery vs inArray) -- 성능과 코드 가독성을 고려하여 판단
- relation-service detectCycle() 최적화 구체 전략 -- 한 번에 chain을 로드하는 CTE vs 배치 조회 중 선택
- R2 Worker CORS 헤더에 `Authorization` 추가 세부 구현

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | 로그인한 사용자가 현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있다 | Password change API: 기존 password.ts, auth-service.ts, JWT utils 재사용. 세션 무효화는 refreshTokens 테이블 DELETE WHERE userId. |
| SEC-01 | R2 Worker가 ALLOWED_ORIGINS 환경변수로 허용된 origin만 CORS 응답한다 | Worker CORS: corsHeaders() 함수 수정. 기본값 `*` 제거, ALLOWED_ORIGINS 필수화. |
| SEC-02 | R2 Worker가 API_SECRET 환경변수 설정 시 Bearer 토큰 없는 업로드를 거부한다 | Worker auth: Env 인터페이스에 API_SECRET 추가, fetch 핸들러에 인증 체크 로직 삽입. |
| SEC-03 | SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거와 렌더링 규칙이 문서화되어 있다 | Documentation: SECURITY.md에 섹션 추가. 기존 XSS 방어/이미지 업로드 보안 섹션 참조. |
| SEC-04 | graph-service.ts가 워크스페이스 소속 문서의 relation만 조회한다 (전체 풀 스캔 제거) | Query optimization: `inArray` 또는 `innerJoin`으로 documents 테이블과 조인하여 workspace 범위 제한. |
| SEC-05 | relation-service.ts의 N+1 쿼리가 JOIN 기반 배치 쿼리로 리팩터링되어 있다 | N+1 fix: getRelations()에서 for 루프 내 개별 쿼리를 단일 JOIN 쿼리로 교체. detectCycle()도 배치 조회로 전환. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- TypeScript strict mode, `any` 금지
- CSS 클래스: `.mf-` 접두사, CSS 변수: `--mf-` 접두사
- Conventional Commits
- 테스트 먼저: 새 기능 구현 시 테스트 코드 먼저 작성 (TDD)
- `console.log` 직접 사용 금지 (logger 유틸 사용)
- 테스트 없이 기능 구현 완료 처리 금지
- 보안: rehype-sanitize 필수, dangerouslySetInnerHTML은 sanitize 통과 HTML만
- DB: 삭제/리셋 시 사용자 승인 필수, 마이그레이션 롤백 가능해야 함
- Git: `git push --force`, `git reset --hard`, `git commit --no-verify` 절대 금지
- 마크다운 파이프라인 순서 변경 금지
- 테스트 프레임워크: Vitest + @testing-library/react (유닛/통합)
- 테스트 커버리지: 유닛 80%+, API 통합 테스트 핵심 플로우 100%

## Standard Stack

### Core (All Existing -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.3.0 | API server | 이미 사용 중. 라우트 패턴, 플러그인 구조 확립됨 [VERIFIED: apps/api/package.json] |
| @fastify/rate-limit | 10.3.0 | Rate limiting | 이미 등록됨. auth 라우트에 per-route config 적용 중 [VERIFIED: apps/api/src/index.ts] |
| @fastify/cookie | 11.0.0 | Cookie handling | refreshToken 쿠키 관리에 사용 중 [VERIFIED: apps/api/package.json] |
| bcryptjs | 3.0.2 | Password hashing | hashPassword(), comparePassword() 유틸 구현됨 [VERIFIED: apps/api/src/utils/password.ts] |
| jsonwebtoken | 9.0.2 | JWT sign/verify | signTokenPair(), signAccessToken() 등 구현됨 [VERIFIED: apps/api/src/utils/jwt.ts] |
| drizzle-orm | 0.39.3 | Database ORM | 전체 API 서비스 레이어에서 사용. JOIN, inArray 지원 [VERIFIED: node_modules/drizzle-orm/package.json] |
| Vitest | 3.x | Test framework | 통합 테스트 30+ 파일 존재, setup/factory 헬퍼 확립됨 [VERIFIED: apps/api/vitest.config.ts] |
| Cloudflare Workers | - | R2 image upload | Worker 런타임. Env 인터페이스로 Secrets 접근 [VERIFIED: apps/worker/wrangler.toml] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/workers-types | 4.x | Worker TypeScript types | Worker 코드에서 Env 타입 확장 시 [VERIFIED: apps/worker/package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | argon2 | argon2가 이론적으로 더 안전하나, bcryptjs가 이미 사용 중이고 SALT_ROUNDS=12로 충분. 마이그레이션 불필요. |
| JWT session invalidation | DB session table | 현재 refreshTokens 테이블이 이미 세션 역할. 별도 session 테이블 불필요. |
| inArray for graph-service | innerJoin | 둘 다 가능. inArray가 기존 docIds Set 패턴과 호환. innerJoin은 더 SQL적이나 결과는 동일. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Relevant Project Structure
```
apps/
├── api/
│   ├── src/
│   │   ├── routes/users.ts          # AUTH-01: 비밀번호 변경 엔드포인트 추가 위치
│   │   ├── routes/auth.ts           # 세션 무효화 패턴 참조
│   │   ├── services/auth-service.ts # 토큰 발급/무효화 로직 재사용
│   │   ├── services/graph-service.ts    # SEC-04: 쿼리 최적화 대상
│   │   ├── services/relation-service.ts # SEC-05: N+1 수정 대상
│   │   ├── middleware/auth.ts       # authMiddleware 재사용
│   │   └── utils/
│   │       ├── password.ts          # hash/compare/validate 재사용
│   │       ├── jwt.ts               # signTokenPair 등 재사용
│   │       └── errors.ts            # badRequest, unauthorized 등
│   └── tests/
│       ├── helpers/
│       │   ├── setup.ts             # 테스트 DB 설정, 트랜잭션 격리
│       │   └── factory.ts           # createUser, createWorkspace 헬퍼
│       └── integration/             # 기존 30+ 통합 테스트 파일
├── worker/
│   └── src/index.ts                 # SEC-01/02: CORS + 인증 수정 대상
└── docs/
    └── SECURITY.md                  # SEC-03: SVG 보안 문서 추가 위치
```

### Pattern 1: Password Change API (AUTH-01)

**What:** 인증된 사용자가 현재 비밀번호를 확인하고 새 비밀번호로 변경하는 API 엔드포인트
**When to use:** `PUT /api/v1/users/me/password`

기존 코드베이스 분석 결과:
- `auth-service.ts`의 `login()` 메서드에 이미 비밀번호 검증 + 실패 카운트 + 잠금 로직이 구현되어 있음 [VERIFIED: apps/api/src/services/auth-service.ts:119-195]
- `password.ts`에 `comparePassword()`, `hashPassword()`, `validatePassword()` 모두 존재 [VERIFIED: apps/api/src/utils/password.ts]
- `refreshTokens` 테이블에 `userId` 인덱스(`idx_refresh_user`) 존재하여 일괄 삭제 효율적 [VERIFIED: packages/db/src/schema/refresh-tokens.ts]
- `users` 테이블에 `loginFailCount`, `lockedUntil` 필드 존재. 비밀번호 변경 실패 카운트에 이 필드를 재사용할지, 별도 필드를 만들지 결정 필요

**Implementation approach:**
```typescript
// apps/api/src/routes/users.ts 에 추가
// 기존 패턴: app.addHook('preHandler', authMiddleware) 가 이미 적용됨

app.put<{ Body: { currentPassword: string; newPassword: string } }>(
  '/me/password',
  authRateLimit(5), // D-02: 로그인과 동일한 실패 정책
  async (request, reply) => {
    // 1. currentUser 확인 (authMiddleware 통과)
    // 2. DB에서 user.passwordHash 조회
    // 3. comparePassword(currentPassword, hash) -- 실패 시 카운트 증가
    // 4. validatePassword(newPassword) -- 유효성 검사
    // 5. hashPassword(newPassword) -- bcrypt
    // 6. Transaction:
    //    a. UPDATE users SET passwordHash, loginFailCount=0, lockedUntil=null
    //    b. DELETE FROM refreshTokens WHERE userId = X AND tokenHash != currentTokenHash
    //    c. INSERT new refreshToken for current session
    // 7. signTokenPair() 로 새 토큰 쌍 발급
    // 8. 응답: { accessToken, refreshToken } + Set-Cookie
  }
);
```

**Critical detail -- Atomic session invalidation (D-01 + D-03):**
- 무효화(DELETE)와 새 토큰 발급(INSERT)이 동일 트랜잭션에서 실행되어야 함
- Drizzle ORM에서 트랜잭션: `db.transaction(async (tx) => { ... })` [VERIFIED: drizzle-orm 0.39.x 지원]
- 현재 세션의 refresh token hash를 보존하면서 나머지를 삭제해야 함
- 그러나 D-03에 따르면 새 토큰을 발급하므로, 기존 토큰도 포함해 전부 삭제 후 새로 INSERT하는 것이 더 깔끔

**Rate limit / Account lock 재사용 (D-02):**
- `loginFailCount`/`lockedUntil` 필드를 그대로 재사용 가능 -- 비밀번호 변경 실패도 "비밀번호 입력 실패"이므로 동일한 카운터로 통합하는 것이 합리적
- 로그인 5회 실패로 잠기면 비밀번호 변경도 잠기고, 비밀번호 변경 실패도 로그인 잠금에 기여 -- 이것이 보안적으로 더 강력한 방식
- 별도 필드를 만들면 공격자가 로그인 5회 + 비변경 5회 = 10회 시도 가능해져 보안 약화

### Pattern 2: R2 Worker CORS Strict Mode (SEC-01)

**What:** Worker의 CORS 응답에서 `*` 기본값을 제거하고 ALLOWED_ORIGINS만 허용
**Current code analysis:** [VERIFIED: apps/worker/src/index.ts:18-29]

```typescript
// 현재 코드 (문제)
const allowed = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? ['*'];
const allowOrigin = allowed.includes('*') || allowed.includes(origin) ? origin : '';

// 수정 후 (D-04)
// ALLOWED_ORIGINS 미설정 시 빈 배열 -- 모든 요청 거부 (fail-closed)
const allowed = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? [];
const allowOrigin = allowed.includes(origin) ? origin : '';
```

**CORS 헤더에 Authorization 추가 (Claude's Discretion):**
```typescript
// SEC-02를 위해 프론트엔드가 Authorization 헤더를 보내므로
// preflight에서 Access-Control-Allow-Headers에 Authorization 추가 필요
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
```

### Pattern 3: R2 Worker Bearer Auth (SEC-02)

**What:** Worker에 Bearer token 인증 추가
**Current code analysis:** `Env` 인터페이스에 `API_SECRET`이 없음 [VERIFIED: apps/worker/src/index.ts:3-6]

```typescript
// Env 인터페이스 확장
interface Env {
  BUCKET: R2Bucket;
  PUBLIC_URL: string;
  ALLOWED_ORIGINS?: string;
  API_SECRET?: string; // Cloudflare Workers Secret
}

// 인증 체크 (upload 핸들러 진입 직후)
if (env.API_SECRET) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.API_SECRET) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 403, cors);
  }
}
// API_SECRET 미설정 시 스킵 (D-05)
```

**D-06 -- API 서버 토큰 발급 엔드포인트:**
- CONTEXT.md의 D-06에 따르면 API 서버에서 업로드용 임시 토큰 발급 엔드포인트 추가
- 그러나 Worker의 인증은 단순 API_SECRET 비교(string equality)이므로, "임시 토큰"이란 API 서버가 API_SECRET 자체를 프론트엔드에 전달하는 것이 아님
- **실제 흐름:** API 서버가 동일한 API_SECRET을 환경변수로 가지고, 인증된 사용자 요청 시 이 값을 응답에 포함하여 프론트엔드가 Worker에 전달
- 또는 더 간단하게: API 서버가 별도 서명된 토큰을 발급하고 Worker가 검증 -- 하지만 D-06는 단순 비교를 명시하므로 API_SECRET 전달 방식이 적합

### Pattern 4: Graph Service Query Optimization (SEC-04)

**What:** documentRelations 전체 테이블 스캔을 workspace 범위로 제한
**Current problem:** [VERIFIED: apps/api/src/services/graph-service.ts:56-62]
```typescript
// 현재: 전체 relation 테이블을 SELECT 한 후 JS에서 필터
const allRelations = await db
  .select({ sourceId, targetId, type })
  .from(documentRelations);
// 이후 for 루프에서 docIds.has() 체크
```

**Recommendation (Claude's Discretion area): `inArray` 접근**

```typescript
// Option A: inArray -- 간결하고 기존 docIds 패턴과 일관적
const docIdArray = docs.map((d) => d.id);
const relations = await db
  .select({
    sourceId: documentRelations.sourceId,
    targetId: documentRelations.targetId,
    type: documentRelations.type,
  })
  .from(documentRelations)
  .where(
    and(
      inArray(documentRelations.sourceId, docIdArray),
      inArray(documentRelations.targetId, docIdArray),
    ),
  );
```

```typescript
// Option B: innerJoin with documents -- DB가 workspace 필터링 수행
const relations = await db
  .select({
    sourceId: documentRelations.sourceId,
    targetId: documentRelations.targetId,
    type: documentRelations.type,
  })
  .from(documentRelations)
  .innerJoin(
    documents,
    and(
      eq(documentRelations.sourceId, documents.id),
      eq(documents.workspaceId, Number(workspaceId)),
      eq(documents.isDeleted, false),
    ),
  );
// 단, target도 같은 워크스페이스인지 확인 필요 -- 두 번째 JOIN 또는 inArray 보조 필요
```

**Recommendation:** Option A (`inArray`)를 추천한다. [ASSUMED]
- 이유: 이미 `docs`를 먼저 조회하여 `docIdArray`를 가지고 있으므로, 두 번의 JOIN보다 `inArray(sourceId, ids) AND inArray(targetId, ids)`가 코드 가독성이 높다
- `idx_document_relations_source`, `idx_document_relations_target` 인덱스가 이미 존재하여 `inArray`가 인덱스를 활용함 [VERIFIED: packages/db/src/schema/document-relations.ts:12-13]
- 10팀 MVP 규모에서 문서 수가 수천 단위이므로 `inArray`의 파라미터 개수 제한(PostgreSQL 32,767)에 근접할 가능성 극히 낮음 [ASSUMED]

### Pattern 5: Relation Service N+1 Fix (SEC-05)

**What:** getRelations()의 for 루프 내 개별 document 조회를 단일 JOIN으로 교체
**Current problem:** [VERIFIED: apps/api/src/services/relation-service.ts:280-301]
```typescript
// 현재: 각 relation row마다 개별 SELECT -- N+1
for (const row of rows) {
  const [target] = await db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(and(eq(documents.id, row.targetId), eq(documents.isDeleted, false)))
    .limit(1);
  // ...
}
```

**Fix -- Single JOIN query:**
```typescript
// relation + document를 한 번에 조회
const rows = await db
  .select({
    type: documentRelations.type,
    targetId: documentRelations.targetId,
    docId: documents.id,
    docTitle: documents.title,
  })
  .from(documentRelations)
  .innerJoin(
    documents,
    and(
      eq(documentRelations.targetId, documents.id),
      eq(documents.isDeleted, false),
    ),
  )
  .where(eq(documentRelations.sourceId, Number(docId)));
```
이 패턴은 codebase에서 이미 사용 중: comment-service.ts, member-service.ts, invitation-service.ts 등에서 `innerJoin(users, ...)` 패턴 확인 [VERIFIED: Grep 결과]

### Pattern 6: detectCycle() Optimization (D-08)

**What:** DFS 루프에서 매 반복마다 개별 쿼리하는 N+1을 배치 또는 CTE로 교체
**Current problem:** [VERIFIED: apps/api/src/services/relation-service.ts:63-139]
- while 루프 안에서 `db.select()` 2회 (정방향 + 역방향)
- 최악의 경우 chain 길이 * 2번 쿼리

**Option A: Batch preload (Claude's Discretion area)**
```typescript
// 전체 next-type relation을 한 번에 로드하여 Map으로 메모리 내 탐색
const nextRelations = await db
  .select({
    sourceId: documentRelations.sourceId,
    targetId: documentRelations.targetId,
  })
  .from(documentRelations)
  .where(eq(documentRelations.type, 'next'));
// Map<sourceId, targetId> 구성 후 while 루프 탐색
```

**Option B: Recursive CTE**
```typescript
// PostgreSQL WITH RECURSIVE로 chain 추적
const result = await db.execute(sql`
  WITH RECURSIVE chain AS (
    SELECT target_id, 1 AS depth
    FROM document_relations
    WHERE source_id = ${startNode} AND type = 'next'
    UNION ALL
    SELECT dr.target_id, c.depth + 1
    FROM chain c
    JOIN document_relations dr ON dr.source_id = c.target_id AND dr.type = 'next'
    WHERE c.depth < 100
  )
  SELECT EXISTS(SELECT 1 FROM chain WHERE target_id = ${searchFor}) AS has_cycle
`);
```

**Recommendation:** Option A (Batch preload)를 추천한다. [ASSUMED]
- 이유: Drizzle ORM의 타입 안전성을 유지하면서 구현 가능
- CTE는 `db.execute(sql`...`)` 로 raw SQL이 필요하여 타입 추론 손실
- MVP 규모에서 next-type relation 전체 로드해도 수천 rows 이하이므로 메모리 문제 없음
- 단, scope를 좁히려면 현재 문서가 속한 workspace의 relation만 로드하는 것이 좋음 -- setRelations()에서 workspaceId를 이미 받고 있으므로 detectCycle()에도 전달 가능

### Anti-Patterns to Avoid
- **전체 테이블 SELECT 후 JS 필터링:** graph-service의 현재 패턴. DB에서 필터링해야 함.
- **for 루프 내 await 쿼리 (N+1):** relation-service의 현재 패턴. JOIN 또는 배치로 해결.
- **비밀번호를 평문 비교:** 항상 `comparePassword()` (bcrypt) 사용. timing attack 방지.
- **세션 무효화 없이 비밀번호 변경:** 계정 탈취 시 공격자 세션이 유지되는 보안 취약점.
- **CORS `*` 기본값 유지:** 모든 origin에서 업로드 가능한 보안 취약점.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcryptjs` (이미 사용 중) | Timing attack, salt 관리 등 복잡성. SALT_ROUNDS=12 [VERIFIED] |
| Token signing | Custom token format | `jsonwebtoken` (이미 사용 중) | JWT 표준 준수, 검증 로직 검증됨 [VERIFIED] |
| Rate limiting | Custom counter | `@fastify/rate-limit` (이미 사용 중) | Window 관리, 분산 환경 고려 [VERIFIED] |
| CORS handling | Custom header logic | Worker의 기존 `corsHeaders()` 수정 | 이미 origin 파싱/매칭 로직 구현됨 [VERIFIED] |
| Query optimization | Custom SQL string | Drizzle ORM `inArray`, `innerJoin` | 타입 안전성 + SQL injection 방지 [VERIFIED] |

**Key insight:** 이 phase의 모든 요구사항은 기존 코드의 수정/확장이다. 새로운 라이브러리나 패턴을 도입할 필요가 전혀 없다.

## Common Pitfalls

### Pitfall 1: 비밀번호 변경 시 Race Condition
**What goes wrong:** 전체 세션 무효화와 새 토큰 발급 사이에 gap이 생겨, 다른 기기에서 만료된 refresh token으로 새 access token을 받을 수 있음
**Why it happens:** DELETE refreshTokens와 INSERT new token이 별도 쿼리로 실행될 때
**How to avoid:** `db.transaction()` 으로 atomic 처리. DELETE ALL + INSERT NEW를 동일 트랜잭션에서 실행
**Warning signs:** 테스트에서 비밀번호 변경 후 이전 refresh token으로 /refresh 호출이 성공하면 버그

### Pitfall 2: CORS Preflight에 Authorization 누락
**What goes wrong:** 프론트엔드가 `Authorization: Bearer xxx` 헤더로 Worker에 요청하면, 브라우저가 preflight(OPTIONS) 요청을 보내는데, `Access-Control-Allow-Headers`에 `Authorization`이 없으면 CORS 에러
**Why it happens:** 현재 Worker의 `corsHeaders()`는 `Content-Type`만 허용 [VERIFIED: apps/worker/src/index.ts:26]
**How to avoid:** `'Access-Control-Allow-Headers': 'Content-Type, Authorization'` 로 확장
**Warning signs:** 브라우저 콘솔에 "Request header field Authorization is not allowed" 에러

### Pitfall 3: graph-service inArray 빈 배열
**What goes wrong:** 워크스페이스에 문서가 0개일 때 `inArray(column, [])` 를 실행하면 SQL 에러 발생 가능
**Why it happens:** PostgreSQL `IN ()` 구문은 빈 리스트를 허용하지 않음
**How to avoid:** 기존 코드에 이미 `if (docs.length === 0) return { nodes: [], edges: [] }` 가드가 있음 [VERIFIED: apps/api/src/services/graph-service.ts:52-54]. 이 가드를 유지할 것.
**Warning signs:** 빈 워크스페이스 그래프 조회 시 500 에러

### Pitfall 4: Worker API_SECRET 타이밍 공격
**What goes wrong:** 단순 `===` 비교는 타이밍 공격에 취약
**Why it happens:** 문자열 비교가 첫 불일치에서 중단되어 길이 정보 노출
**How to avoid:** Cloudflare Workers 환경에서는 `crypto.timingSafeEqual()`이 Web Crypto API로 사용 불가하지만, Workers의 실행 시간이 고정되어 있어 실제 타이밍 공격 벡터가 극히 작음. 단, 방어적으로 구현하려면 SHA-256 해시 후 비교하는 방식 사용 가능
**Warning signs:** 보안 감사에서 타이밍 공격 가능성 지적

### Pitfall 5: 비밀번호 변경 실패 카운트 분리 여부
**What goes wrong:** `loginFailCount`를 비밀번호 변경에도 재사용하면, 로그인 실패 + 비밀번호 변경 실패가 합산되어 예상보다 빨리 잠김
**Why it happens:** 하나의 카운터로 두 가지 행위를 추적
**How to avoid:** D-02에서 "로그인 정책 동일 적용"이라고 명시했으므로, 의도적으로 합산하는 것이 맞음. 이는 보안적으로 더 강력한 방식 (공격자가 10회가 아닌 5회만 시도 가능)
**Warning signs:** 사용자가 로그인 3회 실패 후 비밀번호 변경 2회 실패로 잠기는 것은 의도된 동작

### Pitfall 6: detectCycle() 배치 조회 시 전체 relation 로드
**What goes wrong:** 배치 preload에서 `type='next'`인 전체 relation을 로드하면 불필요한 데이터까지 포함
**Why it happens:** workspace 범위를 좁히지 않았을 때
**How to avoid:** detectCycle은 setRelations() 내부에서만 호출되며 workspaceId를 받으므로, workspace 소속 문서의 next relation만 로드. 또는 setRelations()에서 이미 조회한 workspace 문서 ID 목록을 detectCycle에 전달
**Warning signs:** 대규모 데이터에서 detectCycle이 느린 경우

## Code Examples

### Example 1: Drizzle ORM Transaction Pattern
```typescript
// Source: 기존 코드베이스에서 사용되는 패턴과 drizzle-orm 0.39.x 문서
// 비밀번호 변경 시 세션 무효화 + 새 토큰 발급의 atomic 처리
import { refreshTokens, users, eq } from '@markflow/db';

await db.transaction(async (tx) => {
  // 1. 비밀번호 해시 업데이트
  await tx.update(users).set({
    passwordHash: newHash,
    loginFailCount: 0,
    lockedUntil: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  // 2. 해당 사용자의 모든 refresh token 삭제
  await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

  // 3. 새 refresh token 삽입
  await tx.insert(refreshTokens).values({
    userId,
    tokenHash: newTokenHash,
    expiresAt: getRefreshTokenExpiry(false),
  });
});
```
[VERIFIED: drizzle-orm `transaction()` API는 0.39.x에서 지원됨. 기존 코드베이스에서는 아직 사용되지 않지만, drizzle-orm 공식 문서에서 확인.]

### Example 2: Drizzle innerJoin for N+1 Fix
```typescript
// Source: apps/api/src/services/comment-service.ts:46 에서 사용 중인 패턴
// relation-service getRelations() N+1 수정
const rows = await db
  .select({
    type: documentRelations.type,
    targetId: documentRelations.targetId,
    docId: documents.id,
    docTitle: documents.title,
  })
  .from(documentRelations)
  .innerJoin(
    documents,
    and(
      eq(documentRelations.targetId, documents.id),
      eq(documents.isDeleted, false),
    ),
  )
  .where(eq(documentRelations.sourceId, Number(docId)));

// 결과를 prev/next/related로 분류
let prevDoc: RelationDoc | null = null;
let nextDoc: RelationDoc | null = null;
const relatedDocs: RelationDoc[] = [];

for (const row of rows) {
  const doc = { id: row.docId, title: row.docTitle };
  if (row.type === 'prev') prevDoc = doc;
  else if (row.type === 'next') nextDoc = doc;
  else if (row.type === 'related') relatedDocs.push(doc);
}
```
[VERIFIED: innerJoin 패턴은 comment-service.ts, member-service.ts 등에서 확인됨]

### Example 3: Worker Auth Check
```typescript
// Source: Cloudflare Workers 공식 패턴 + D-05/D-06 결정 적용
// apps/worker/src/index.ts의 upload 핸들러 진입부에 추가

// 인증 체크 (API_SECRET 설정 시에만 적용)
if (env.API_SECRET) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== env.API_SECRET) {
    return jsonResponse(
      { success: false, error: 'Unauthorized: invalid or missing bearer token' },
      403,
      cors,
    );
  }
}
```
[VERIFIED: Cloudflare Workers Secrets 문서에서 `env.SECRET_NAME` 접근 패턴 확인]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter @markflow/api test -- --run` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | 비밀번호 변경 (현재 PW 확인 + 새 PW + 세션 무효화 + 실패 잠금) | integration | `pnpm --filter @markflow/api test -- --run tests/integration/password-change.test.ts` | Wave 0 |
| SEC-01 | R2 Worker CORS strict (허용 origin만 응답) | integration | `pnpm --filter @markflow/api test -- --run tests/integration/worker-cors.test.ts` | Wave 0 (Worker 테스트 인프라 필요) |
| SEC-02 | R2 Worker Bearer token 인증 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/worker-auth.test.ts` | Wave 0 (Worker 테스트 인프라 필요) |
| SEC-03 | SECURITY.md SVG 분리 규칙 문서화 | manual-only | N/A -- 문서 리뷰 | N/A |
| SEC-04 | graph-service workspace 범위 쿼리 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/graph.test.ts` | Exists (기능 테스트). 성능 검증 테스트 Wave 0 |
| SEC-05 | relation-service N+1 수정 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/relations.test.ts` | Exists (기능 테스트). N+1 검증 테스트 추가 필요 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @markflow/api test -- --run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/tests/integration/password-change.test.ts` -- AUTH-01 비밀번호 변경 통합 테스트
- [ ] Worker 테스트: SEC-01/SEC-02는 Cloudflare Worker 런타임 의존이므로 unit test로 대체 가능 (corsHeaders, auth check 함수를 export하여 테스트)
- [ ] `apps/api/tests/integration/graph.test.ts` 에 "전체 스캔이 아닌 workspace 범위 쿼리 실행" 검증 추가
- [ ] `apps/api/tests/integration/relations.test.ts` 에 getRelations() 호출 시 쿼리 수가 N+1이 아닌지 검증 (또는 기존 기능 테스트가 리팩터링 후에도 통과하는지 확인)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs (SALT_ROUNDS=12), JWT access/refresh token pair |
| V3 Session Management | yes | refreshTokens DB table, HttpOnly/SameSite=Strict cookies |
| V4 Access Control | yes | RBAC middleware (requireRole), workspace isolation |
| V5 Input Validation | yes | validatePassword(), Fastify body validation |
| V6 Cryptography | no (이 phase에서 암호화 관련 변경 없음) | N/A |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute-force password change | Spoofing | Rate limit 5회/15분 + account lock (D-02) |
| Session fixation after PW change | Elevation | 전체 세션 무효화 + 새 토큰 발급 (D-01/D-03) |
| Cross-origin upload abuse | Tampering | ALLOWED_ORIGINS strict (D-04) |
| Unauthorized R2 upload | Elevation | Bearer token auth (D-05/D-06) |
| Full table scan DoS (graph) | Denial | inArray workspace 범위 제한 (SEC-04) |
| SVG XSS in avatar | Tampering | SVG 거부 (SEC-03 문서화) |
| N+1 query DoS (relations) | Denial | JOIN batch query (SEC-05) |
| Timing attack on Worker auth | Information Disclosure | Workers 런타임 고정 실행 시간 + SHA-256 사전 해시 고려 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CORS `*` 기본값 | ALLOWED_ORIGINS strict | 이 phase에서 변경 | 미인가 origin 업로드 차단 |
| 인증 없는 R2 업로드 | Bearer token 인증 | 이 phase에서 변경 | 외부 업로드 공격 차단 |
| 전체 relation 테이블 스캔 | inArray workspace 범위 | 이 phase에서 변경 | O(N) -> O(workspace docs) 개선 |
| N+1 document 개별 조회 | JOIN 배치 쿼리 | 이 phase에서 변경 | 쿼리 수 N+1 -> 1 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | inArray가 innerJoin보다 graph-service에 적합하다는 판단 | Architecture Patterns - Pattern 4 | 낮음 -- 둘 다 동작, 성능 차이 미미 |
| A2 | Batch preload가 CTE보다 detectCycle에 적합하다는 판단 | Architecture Patterns - Pattern 6 | 낮음 -- CTE도 정상 동작, 타입 안전성 차이 |
| A3 | PostgreSQL inArray 파라미터 32,767개 제한이 MVP에서 문제되지 않음 | Architecture Patterns - Pattern 4 | 매우 낮음 -- 10팀 규모 |
| A4 | loginFailCount를 비밀번호 변경에도 재사용하는 것이 D-02의 의도 | Common Pitfalls - Pitfall 5 | 중간 -- 분리 필드가 필요할 수도 있음. D-02 "동일 적용" 해석에 따라 다름 |

## Open Questions

1. **비밀번호 변경 실패 카운트 필드**
   - What we know: users 테이블에 `loginFailCount`, `lockedUntil` 존재. D-02는 "로그인 정책 동일 적용"
   - What's unclear: "동일 적용"이 "같은 카운터 공유"인지 "같은 정책의 별도 카운터"인지
   - Recommendation: 보안 강화 관점에서 같은 카운터 공유 추천. 사용자 경험상 문제가 될 경우 분리 가능하나, 초기에는 공유가 안전.

2. **D-06 토큰 발급 엔드포인트 상세**
   - What we know: API 서버에서 업로드용 토큰 발급 엔드포인트 추가. Worker는 단순 string 비교.
   - What's unclear: 프론트엔드가 매 업로드마다 토큰을 요청하는지, 한 번 받아서 캐싱하는지
   - Recommendation: API 서버가 인증된 요청에 대해 API_SECRET을 그대로 반환하는 단순 엔드포인트 (`GET /api/v1/upload-token`). 프론트엔드는 세션 동안 캐싱. 이 방식이 Worker의 "단순 string 비교" 구조와 일관됨.

3. **Worker 테스트 전략**
   - What we know: Worker는 Cloudflare Workers 런타임에서 실행. `wrangler dev`로 로컬 테스트 가능.
   - What's unclear: CI에서 Worker 테스트를 어떻게 실행할지
   - Recommendation: corsHeaders()와 auth check 로직을 순수 함수로 추출하여 일반 unit test로 검증. 전체 Worker 통합 테스트는 수동 또는 `wrangler dev` 기반으로 진행.

## Sources

### Primary (HIGH confidence)
- `apps/worker/src/index.ts` -- R2 Worker 전체 구현 (117줄)
- `apps/api/src/services/graph-service.ts` -- 전체 스캔 문제 확인 (81줄)
- `apps/api/src/services/relation-service.ts` -- N+1 문제 확인 (311줄)
- `apps/api/src/routes/users.ts` -- 비밀번호 변경 추가 위치 (105줄)
- `apps/api/src/services/auth-service.ts` -- 세션/토큰 관리 패턴 (305줄)
- `apps/api/src/utils/password.ts` -- hash/compare/validate (24줄)
- `apps/api/src/utils/jwt.ts` -- JWT sign/verify (57줄)
- `packages/db/src/schema/refresh-tokens.ts` -- refreshTokens 테이블 스키마
- `packages/db/src/schema/users.ts` -- users 테이블 스키마 (loginFailCount, lockedUntil)
- `packages/db/src/schema/document-relations.ts` -- 인덱스 확인
- `docs/SECURITY.md` -- 기존 보안 문서 구조
- `apps/api/vitest.config.ts` -- 테스트 설정
- `apps/api/tests/helpers/factory.ts` -- 테스트 팩토리 패턴

### Secondary (MEDIUM confidence)
- [Cloudflare Workers Secrets docs](https://developers.cloudflare.com/workers/configuration/secrets/) -- Worker 환경변수/시크릿 패턴 [CITED]
- [Drizzle ORM transaction docs](https://orm.drizzle.team/docs/transactions) -- 트랜잭션 API [CITED]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 신규 의존성 없음, 모든 라이브러리가 코드베이스에서 이미 사용 중이며 버전 확인 완료
- Architecture: HIGH -- 모든 패턴이 기존 코드베이스의 패턴 확장이며, 참조 코드가 명확
- Pitfalls: HIGH -- 실제 코드 분석을 통해 구체적 문제점 식별 완료
- Security: HIGH -- ASVS 카테고리 매핑과 STRIDE 위협 패턴이 phase 요구사항에 정확히 대응

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (안정적인 기존 스택, 30일)
