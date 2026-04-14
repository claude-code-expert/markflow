# Phase 3: Category & Document Context API - Research

**Researched:** 2026-04-13
**Domain:** Fastify REST API / PostgreSQL Closure Table / Drizzle ORM
**Confidence:** HIGH

## Summary

Phase 3은 기존 인프라(categoryClosure 테이블, documentRelations 테이블)를 read-only API로 노출하는 작업이다. 새 라이브러리나 DB 마이그레이션이 필요 없으며, 기존 서비스에 메서드를 추가하고 라우트를 등록하는 패턴만으로 구현 가능하다.

핵심 인프라가 이미 완비되어 있다: `categoryClosure` 테이블은 ancestor_id/descendant_id/depth 칼럼으로 ancestors/descendants 조회를 O(n) 쿼리 한 번으로 지원하고, `documentRelations` 테이블은 sourceId/targetId/type으로 incoming/outgoing 관계를 조회할 수 있다. 기존 `tree()` 메서드의 nodeMap 패턴과 `getRelations()` 의 JOIN 패턴을 확장하면 된다.

**Primary recommendation:** 새 패키지/라이브러리 없이 기존 서비스 확장 + 라우트 추가만으로 구현. closure table 직접 조회(CTE 불필요), LEFT JOIN 배치 쿼리로 N+1 방지.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ancestors API 응답 정렬 순서는 Root -> Leaf (breadcrumb UI용)
- **D-02:** 풀 카테고리 객체 반환 — `{id, name, parentId, depth, createdAt}`
- **D-03:** Descendants API는 Nested tree 구조 반환 (기존 `tree()` 패턴과 동일)
- **D-04:** Descendants에 문서 목록 포함 — `{id, title, updatedAt}` (CategoryTreeDocument 재사용)
- **D-05:** DAG context 관련 문서 메타에 title + categoryId + categoryName + tags 포함
- **D-06:** 관계를 incoming + outgoing + related 3분류로 분리
- **D-07:** Ancestors/Descendants는 기존 `categories.ts` 라우트에 추가
- **D-08:** DAG context는 기존 `graph.ts` 라우트에 추가
- **D-09:** 모든 새 API의 권한은 viewer (read-only)

### Claude's Discretion
- categoryClosure 쿼리 최적화 방식 (단일 쿼리 vs CTE vs closure table 직접 조회)
- DAG context의 tags JOIN 구현 방식 (subquery vs LEFT JOIN)
- 응답 타입 정의 위치 및 네이밍
- 서비스 레이어 함수 분리 방식 (기존 서비스 확장 vs 새 서비스 생성)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | 특정 카테고리의 모든 조상(ancestors)을 단일 API 호출로 조회 (breadcrumb용) | categoryClosure 테이블 WHERE descendant_id = :id, depth > 0 쿼리 + categories JOIN으로 구현. Architecture Pattern 1 참조. |
| CAT-02 | 특정 카테고리의 모든 하위(descendants)를 단일 API 호출로 조회 | categoryClosure WHERE ancestor_id = :id + 기존 tree() nodeMap 패턴으로 트리 조립. Architecture Pattern 2 참조. |
| DOC-01 | 단일 문서의 전후방 관계(incoming/outgoing)를 단일 API로 조회 (DAG context) | documentRelations 양방향 쿼리(sourceId/targetId) + documents/categories/tags JOIN. Architecture Pattern 3 참조. |
| DOC-02 | DAG context가 관련 문서 메타데이터(제목, 카테고리)를 포함 | D-05 결정에 따라 title + categoryId + categoryName + tags 포함. 배치 LEFT JOIN으로 N+1 방지. |
</phase_requirements>

## Standard Stack

### Core (기존 스택만 — 새 의존성 없음)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.3.0 | API 서버 | 기존 스택 [VERIFIED: codebase] |
| Drizzle ORM | 0.39.0 | DB 쿼리 빌더 | 기존 스택, sql template literal로 raw SQL 가능 [VERIFIED: codebase] |
| PostgreSQL | 16 | categoryClosure + documentRelations 저장 | Closure table 인프라 이미 구축됨 [VERIFIED: codebase schema] |

### Supporting
없음 — 이 페이즈는 새 라이브러리가 필요하지 않다.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Closure table 직접 조회 | Recursive CTE | CTE는 런타임 재귀로 depth가 깊을수록 성능 저하. Closure table이 이미 있으므로 불필요 |
| LEFT JOIN 배치 | Subquery per relation | N+1 문제 발생. LEFT JOIN이 단일 쿼리로 모든 메타데이터 가져옴 |

## Architecture Patterns

### Recommended Project Structure (변경 파일)
```
apps/api/src/
├── services/
│   ├── category-service.ts     # +ancestors(), +descendants() 메서드 추가
│   └── graph-service.ts        # +getDocumentContext() 메서드 추가
├── routes/
│   ├── categories.ts           # +GET /:id/ancestors, +GET /:id/descendants
│   └── graph.ts                # +GET /documents/:id/context
└── (tests/)
    └── integration/
        ├── category-context.test.ts    # ancestors/descendants 테스트
        └── dag-context.test.ts         # DAG context 테스트
```

### Pattern 1: Ancestors 조회 (Closure Table Direct Query)
**What:** categoryClosure 테이블에서 descendant_id로 조회하여 모든 조상을 한 번에 가져옴
**When to use:** CAT-01 구현 시
**Example:**
```typescript
// Source: codebase categoryClosure schema + D-01/D-02 결정
async function ancestors(categoryId: string, workspaceId: string) {
  const numCategoryId = Number(categoryId);
  const numWorkspaceId = Number(workspaceId);

  // 카테고리 존재 확인 (워크스페이스 소속)
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(
      eq(categories.id, numCategoryId),
      eq(categories.workspaceId, numWorkspaceId),
    ))
    .limit(1);

  if (!category) throw notFound('Category not found');

  // Closure table에서 ancestors 조회 (depth > 0: 자기 자신 제외)
  // D-01: Root → Leaf 순서 (depth DESC)
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
      depth: categoryClosure.depth,
      createdAt: categories.createdAt,
    })
    .from(categoryClosure)
    .innerJoin(categories, eq(categoryClosure.ancestorId, categories.id))
    .where(and(
      eq(categoryClosure.descendantId, numCategoryId),
      gt(categoryClosure.depth, 0),
    ))
    .orderBy(desc(categoryClosure.depth)); // Root first (highest depth)

  return rows;
}
```
[VERIFIED: codebase schema `categoryClosure` has ancestorId, descendantId, depth columns]

### Pattern 2: Descendants 트리 조립 (기존 tree() 패턴 재사용)
**What:** closure table로 하위 카테고리 ID를 가져온 후, nodeMap 패턴으로 트리 구조 조립
**When to use:** CAT-02 구현 시
**Example:**
```typescript
// Source: 기존 tree() 메서드 패턴 + D-03/D-04 결정
async function descendants(categoryId: string, workspaceId: string) {
  const numCategoryId = Number(categoryId);
  const numWorkspaceId = Number(workspaceId);

  // 1. closure에서 descendant ID 목록 (depth > 0: 자기 자신 제외)
  const closureRows = await db
    .select({ descendantId: categoryClosure.descendantId })
    .from(categoryClosure)
    .where(and(
      eq(categoryClosure.ancestorId, numCategoryId),
      gt(categoryClosure.depth, 0),
    ));

  if (closureRows.length === 0) return { children: [], documents: [] };

  const descendantIds = closureRows.map(r => r.descendantId);

  // 2. 카테고리 상세 조회 (워크스페이스 검증 포함)
  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(and(
      inArray(categories.id, descendantIds),
      eq(categories.workspaceId, numWorkspaceId),
    ))
    .orderBy(asc(categories.orderIndex), asc(categories.name));

  // 3. 문서 조회 (D-04: 각 카테고리 소속 문서)
  const docRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      categoryId: documents.categoryId,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(
      inArray(documents.categoryId, descendantIds),
      eq(documents.workspaceId, numWorkspaceId),
      eq(documents.isDeleted, false),
    ));

  // 4. tree() 동일 패턴: nodeMap + children 조립
  // (기존 tree() 코드 재사용)
}
```
[VERIFIED: codebase `tree()` method uses nodeMap + roots pattern at category-service.ts:294-308]

### Pattern 3: DAG Context (양방향 관계 + 메타데이터 JOIN)
**What:** documentRelations에서 sourceId/targetId 양방향으로 조회하고, documents + categories + tags JOIN
**When to use:** DOC-01, DOC-02 구현 시
**Example:**
```typescript
// Source: 기존 getRelations() + graph-service 패턴 + D-05/D-06 결정
async function getDocumentContext(docId: string, workspaceId: string) {
  const numDocId = Number(docId);
  const numWorkspaceId = Number(workspaceId);

  // 문서 존재 확인 (워크스페이스 소속)
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(
      eq(documents.id, numDocId),
      eq(documents.workspaceId, numWorkspaceId),
      eq(documents.isDeleted, false),
    ))
    .limit(1);

  if (!doc) throw notFound('Document not found');

  // Outgoing: 이 문서가 source인 관계 (기존 getRelations 패턴)
  const outgoing = await db
    .select({
      type: documentRelations.type,
      docId: documents.id,
      docTitle: documents.title,
      categoryId: documents.categoryId,
      categoryName: categories.name,
    })
    .from(documentRelations)
    .innerJoin(documents, and(
      eq(documentRelations.targetId, documents.id),
      eq(documents.isDeleted, false),
    ))
    .leftJoin(categories, eq(documents.categoryId, categories.id))
    .where(eq(documentRelations.sourceId, numDocId));

  // Incoming: 이 문서가 target인 관계 (D-06: incoming 분류)
  const incoming = await db
    .select({
      type: documentRelations.type,
      docId: documents.id,
      docTitle: documents.title,
      categoryId: documents.categoryId,
      categoryName: categories.name,
    })
    .from(documentRelations)
    .innerJoin(documents, and(
      eq(documentRelations.sourceId, documents.id),
      eq(documents.isDeleted, false),
    ))
    .leftJoin(categories, eq(documents.categoryId, categories.id))
    .where(eq(documentRelations.targetId, numDocId));

  // Tags: 관련 문서들의 태그를 배치로 가져오기
  const relatedDocIds = [...new Set([
    ...outgoing.map(r => r.docId),
    ...incoming.map(r => r.docId),
  ])];

  // documentTags + tags LEFT JOIN (N+1 방지)
  let tagMap = new Map<number, string[]>();
  if (relatedDocIds.length > 0) {
    const tagRows = await db
      .select({
        documentId: documentTags.documentId,
        tagName: tags.name,
      })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(inArray(documentTags.documentId, relatedDocIds));

    for (const row of tagRows) {
      const existing = tagMap.get(row.documentId) ?? [];
      existing.push(row.tagName);
      tagMap.set(row.documentId, existing);
    }
  }

  // 결과 조립: incoming/outgoing/related 분류
}
```
[VERIFIED: documentRelations schema has sourceId, targetId, type columns]
[VERIFIED: tags/documentTags schema in packages/db/src/schema/tags.ts]

### Anti-Patterns to Avoid
- **Recursive CTE 사용:** categoryClosure 테이블이 이미 있으므로 불필요한 재귀 CTE는 성능만 낭비한다
- **N+1 쿼리:** 각 관련 문서마다 개별 tags 조회 대신 inArray() 배치 쿼리 사용
- **워크스페이스 검증 누락:** 모든 쿼리에 workspaceId 필터 필수 (SEC-04 패턴)
- **새 서비스 파일 생성:** 기존 category-service, graph-service에 메서드 추가가 일관된 패턴

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ancestor 조회 | Recursive parent 탐색 | categoryClosure WHERE descendant_id | O(depth) 쿼리 vs O(1) 쿼리 |
| 트리 조립 | 재귀 함수 새로 작성 | 기존 tree() nodeMap 패턴 | 이미 검증된 코드, 일관성 유지 |
| 관계 메타데이터 | 관계별 개별 조회 | JOIN 배치 쿼리 | N+1 방지 |

**Key insight:** 이 페이즈의 모든 기능은 이미 존재하는 DB 구조와 코드 패턴의 조합이다. 새로운 것을 만들 필요가 없다.

## Common Pitfalls

### Pitfall 1: Closure Table Self-Reference 포함
**What goes wrong:** `WHERE descendant_id = :id`로 ancestors 조회 시 depth=0인 자기 자신도 포함됨
**Why it happens:** categoryClosure에 모든 카테고리의 self-reference (depth=0) 행이 있음
**How to avoid:** `depth > 0` 조건 추가 (gt(categoryClosure.depth, 0))
**Warning signs:** ancestors 배열에 조회한 카테고리 자신이 포함되어 있음

### Pitfall 2: Incoming 관계 누락
**What goes wrong:** 기존 getRelations()는 sourceId만 조회하여 outgoing만 반환
**Why it happens:** 기존 메서드는 "이 문서가 참조하는 것"만 목적이었음
**How to avoid:** DAG context에서는 targetId도 조회하여 incoming 관계를 별도 수집
**Warning signs:** 다른 문서가 이 문서를 참조하지만 DAG context에 나타나지 않음

### Pitfall 3: Workspace 격리 실패
**What goes wrong:** 다른 워크스페이스의 카테고리/문서가 응답에 포함됨
**Why it happens:** closure table JOIN에 workspaceId 필터를 빼먹음
**How to avoid:** 모든 categories/documents 조회에 workspaceId 조건 포함
**Warning signs:** 테스트에서 다른 워크스페이스 데이터가 노출됨

### Pitfall 4: Soft-deleted 문서 포함
**What goes wrong:** DAG context에 삭제된 문서가 관련 문서로 나타남
**Why it happens:** documentRelations는 soft-delete를 인식하지 않음
**How to avoid:** documents JOIN 시 `isDeleted = false` 조건 필수
**Warning signs:** 삭제한 문서가 여전히 관계 그래프에 표시됨

### Pitfall 5: Descendants에서 루트 카테고리 중복 반환
**What goes wrong:** descendants API가 조회 대상 카테고리 자체를 트리 루트에 포함
**Why it happens:** closure에서 depth=0인 self-reference 행이 반환됨
**How to avoid:** depth > 0 필터로 자기 자신 제외, 또는 응답에서 명시적으로 제외
**Warning signs:** descendants 트리의 루트가 조회한 카테고리 자체임

## Code Examples

### 기존 패턴: 서비스 팩토리 + 라우트 등록
```typescript
// Source: apps/api/src/routes/categories.ts (기존 코드)
// 라우트 등록 패턴 — 새 엔드포인트도 동일 패턴
app.get<{
  Params: { wsId: string; id: string };
}>('/workspaces/:wsId/categories/:id/ancestors', {
  preHandler: requireRole('viewer'),  // D-09: viewer 권한
}, async (request, reply) => {
  const ancestors = await categoryService.ancestors(
    request.params.id,
    request.params.wsId,
  );
  return reply.status(200).send({ ancestors });
});
```
[VERIFIED: codebase route pattern at categories.ts]

### 기존 패턴: Drizzle 쿼리에서 gt 사용
```typescript
// gt는 @markflow/db에서 re-export 필요 여부 확인
// 현재 re-export: eq, and, or, desc, asc, sql, isNull, gt, lt, gte, lte, ne, like, ilike, inArray, notInArray, count
import { gt, desc } from '@markflow/db';
```
[VERIFIED: packages/db/src/index.ts exports gt, desc]

### 기존 패턴: 에러 처리
```typescript
// Source: apps/api/src/utils/errors.ts
import { notFound } from '../utils/errors.js';
// 카테고리/문서가 없을 때
throw notFound('Category not found');
throw notFound('Document not found');
```
[VERIFIED: codebase error pattern used consistently]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recursive CTE for ancestors | Closure table direct query | DB 설계 시점 (Phase 1) | O(1) 쿼리로 ancestors/descendants 조회 가능 |
| N+1 relation queries | JOIN 배치 쿼리 | SEC-05 (Phase 1) | relation-service가 이미 JOIN 패턴으로 리팩터링됨 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | gt (greater than) 함수가 @markflow/db에서 export됨 | Architecture Patterns | LOW — export 목록에 gt 확인됨, 누락 시 re-export 추가만 필요 |
| A2 | descendants에서 inArray()로 카테고리 + 문서를 한 번에 조회 가능 | Pattern 2 | LOW — Drizzle inArray는 이미 다른 서비스에서 사용 중 |

**대부분의 claim이 코드베이스에서 직접 확인됨 — 사용자 확인이 필요한 미결정 사항 없음.**

## Open Questions

1. **Descendants API의 depth 제한**
   - What we know: Closure table에 제한 없이 모든 depth의 descendants 저장됨
   - What's unclear: 트리가 매우 깊을 경우 (10+ depth) 응답 크기 문제
   - Recommendation: MVP에서는 제한 없이 전체 반환. 10팀 규모에서 문제 없을 것. 필요 시 `maxDepth` 쿼리 파라미터 추가.

2. **DAG context에서 bidirectional 관계 중복**
   - What we know: A가 B를 `related`로 설정하면 sourceId=A, targetId=B 행 1개만 생성
   - What's unclear: incoming/outgoing 분류 시 `related` 타입은 방향이 의미 없음
   - Recommendation: D-06에 따라 related는 별도 분류. outgoing에서 type='related'인 것 + incoming에서 type='related'인 것을 합쳐서 중복 제거.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter @markflow/api test -- --run` |
| Full suite command | `pnpm --filter @markflow/api test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Ancestors API: 루트까지 조상 순서 반환 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/category-context.test.ts` | Wave 0 |
| CAT-01 | Ancestors: 존재하지 않는 카테고리 404 | integration | 위와 동일 | Wave 0 |
| CAT-01 | Ancestors: 루트 카테고리는 빈 배열 | integration | 위와 동일 | Wave 0 |
| CAT-02 | Descendants API: 트리 구조 + 문서 포함 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/category-context.test.ts` | Wave 0 |
| CAT-02 | Descendants: 리프 카테고리는 빈 children | integration | 위와 동일 | Wave 0 |
| DOC-01 | DAG context: incoming/outgoing/related 분류 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/dag-context.test.ts` | Wave 0 |
| DOC-01 | DAG context: 삭제된 문서 제외 | integration | 위와 동일 | Wave 0 |
| DOC-02 | DAG context: title + categoryName + tags 포함 | integration | 위와 동일 | Wave 0 |
| DOC-02 | DAG context: 워크스페이스 격리 | integration | 위와 동일 | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @markflow/api test -- --run`
- **Per wave merge:** `pnpm --filter @markflow/api test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/tests/integration/category-context.test.ts` -- CAT-01, CAT-02 테스트
- [ ] `apps/api/tests/integration/dag-context.test.ts` -- DOC-01, DOC-02 테스트
- 기존 test helper (`factory.ts`, `setup.ts`)는 재사용 가능. 카테고리/문서/관계 생성 헬퍼 이미 존재.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | 기존 authMiddleware (JWT) [VERIFIED: codebase] |
| V3 Session Management | no | Read-only API, 세션 변경 없음 |
| V4 Access Control | yes | requireRole('viewer') — 워크스페이스 멤버십 검증 [VERIFIED: codebase] |
| V5 Input Validation | yes | categoryId/docId 숫자 검증 (Number() + notFound) |
| V6 Cryptography | no | 암호화 불필요 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 워크스페이스 간 데이터 노출 | Information Disclosure | 모든 쿼리에 workspaceId 필터 [VERIFIED: 기존 패턴] |
| 삭제된 문서 메타 노출 | Information Disclosure | documents.isDeleted = false JOIN 조건 |
| 대량 descendants 응답 DoS | Denial of Service | MVP에서는 10팀 규모로 위험 낮음. 필요 시 maxDepth 파라미터 |

## Project Constraints (from CLAUDE.md)

- TypeScript strict mode, `any` 금지
- 테스트 먼저 작성 (TDD)
- Conventional Commits
- 큰 변경 전 계획 공유/승인
- `console.log` 직접 사용 금지 (logger 사용)
- DB 삭제/리셋 시 사용자 승인 필수
- 서비스 팩토리 패턴: `createXxxService(db)`
- 라우트 권한 패턴: `preHandler: requireRole('viewer')`
- 에러 패턴: `throw notFound('...')`

## Sources

### Primary (HIGH confidence)
- `packages/db/src/schema/categories.ts` -- categoryClosure 테이블 구조 확인
- `packages/db/src/schema/document-relations.ts` -- documentRelations 테이블 구조 확인
- `packages/db/src/schema/tags.ts` -- tags, documentTags 테이블 구조 확인
- `apps/api/src/services/category-service.ts` -- 기존 tree(), list() 패턴 확인
- `apps/api/src/services/relation-service.ts` -- 기존 getRelations() JOIN 패턴 확인
- `apps/api/src/services/graph-service.ts` -- 기존 getWorkspaceGraph() 패턴 확인
- `apps/api/src/routes/categories.ts` -- 기존 라우트 등록 패턴 확인
- `apps/api/src/routes/graph.ts` -- 기존 그래프 라우트 패턴 확인
- `packages/db/src/index.ts` -- re-export 목록 (gt, desc, inArray 등) 확인

### Secondary (MEDIUM confidence)
- `apps/api/tests/integration/graph.test.ts` -- 기존 테스트 패턴 참조
- `apps/api/tests/integration/categories.test.ts` -- 기존 카테고리 테스트 참조

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 새 라이브러리 없음, 기존 스택만 사용
- Architecture: HIGH -- 모든 패턴이 기존 코드에서 직접 확인됨
- Pitfalls: HIGH -- closure table 특성과 relation 양방향 조회는 스키마에서 확인 가능

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (안정적 — DB 스키마와 기존 패턴 기반)
