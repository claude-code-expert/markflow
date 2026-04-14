# Phase 3: Category & Document Context API - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

카테고리 계층 탐색(ancestors/descendants)과 문서 관계 DAG 컨텍스트를 read-only API로 노출하여, 프론트엔드가 breadcrumb과 관계 그래프를 효율적으로 렌더링할 수 있다. 새 기능 발명이 아니라 기존 인프라(categoryClosure 테이블, relation-service)를 API로 안전하게 노출하는 것이다.

</domain>

<decisions>
## Implementation Decisions

### Ancestors API
- **D-01:** 응답 정렬 순서는 **Root → Leaf** — breadcrumb UI에서 바로 사용 가능하도록 루트부터 현재 카테고리까지 순서대로 반환한다.
- **D-02:** **풀 카테고리 객체** 반환 — 각 ancestor에 `{id, name, parentId, depth, createdAt}` 포함. 프론트엔드에서 추가 조회 없이 카테고리 정보 활용 가능.

### Descendants API
- **D-03:** **Nested tree 구조** 반환 — 기존 `tree()` 메서드 패턴과 동일한 재귀 구조. 프론트엔드 사이드바 트리 렌더링에 바로 사용 가능.
- **D-04:** **문서 목록 포함** — 각 카테고리에 소속된 문서의 `{id, title, updatedAt}` 포함. 기존 `CategoryTreeDocument` 타입 재사용.

### DAG Context API
- **D-05:** 관련 문서 메타데이터에 **title + categoryId + categoryName + tags** 포함 — documents, categories, documentTags JOIN으로 단일 쿼리. 프론트엔드가 관계 그래프 노드를 풍부하게 렌더링 가능.
- **D-06:** 관계를 **incoming + outgoing + related** 3분류로 분리 — incoming은 이 문서를 target으로 참조하는 문서들, outgoing은 이 문서가 source로 참조하는 문서들, related는 양방향 관련 문서.

### 엔드포인트 배치
- **D-07:** Ancestors/Descendants는 **기존 `categories.ts` 라우트에 추가** — `GET /workspaces/:wsId/categories/:id/ancestors`, `GET /workspaces/:wsId/categories/:id/descendants`. URL 구조가 직관적이고 기존 라우트 파일 확장.
- **D-08:** DAG context는 **기존 `graph.ts` 라우트에 추가** — `GET /workspaces/:wsId/graph/documents/:id/context`. 문서 관계 그래프와 같은 라우트 파일.
- **D-09:** 모든 새 API의 권한은 **viewer** — read-only API이므로 기존 GET /categories, GET /graph와 동일한 권한 수준.

### Claude's Discretion
- categoryClosure 쿼리 최적화 방식 (단일 쿼리 vs CTE vs closure table 직접 조회)
- DAG context의 tags JOIN 구현 방식 (subquery vs LEFT JOIN)
- 응답 타입 정의 위치 및 네이밍
- 서비스 레이어 함수 분리 방식 (기존 서비스 확장 vs 새 서비스 생성)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 카테고리 스키마 & 서비스
- `packages/db/src/schema/categories.ts` — categories 테이블 + categoryClosure 테이블 (ancestor_id, descendant_id, depth). ancestors/descendants 쿼리의 핵심 인프라.
- `apps/api/src/services/category-service.ts` — 기존 CRUD + tree() + reorder(). ancestors/descendants 메서드 추가 대상.
- `apps/api/src/routes/categories.ts` — 기존 카테고리 라우트. ancestors/descendants 엔드포인트 추가 위치.

### 문서 관계 & 그래프
- `apps/api/src/services/relation-service.ts` — getRelations(docId) 현재 prev/next/related + {id, title}만 반환. DAG context에서 확장 또는 새 메서드 참고.
- `apps/api/src/services/graph-service.ts` — getWorkspaceGraph() 전체 워크스페이스 그래프. DAG context 서비스 로직 참고.
- `apps/api/src/routes/graph.ts` — 기존 그래프 라우트. DAG context 엔드포인트 추가 위치.

### 요구사항 및 로드맵
- `.planning/REQUIREMENTS.md` — CAT-01(ancestors), CAT-02(descendants), DOC-01(DAG context), DOC-02(DAG 메타데이터)
- `.planning/ROADMAP.md` — Phase 3 성공 기준 3개 항목

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `categoryClosure` 테이블 — ancestor_id, descendant_id, depth 칼럼. ancestors는 `WHERE descendant_id = :id`로 조회, descendants는 `WHERE ancestor_id = :id`로 조회.
- `CategoryTreeNode`, `CategoryTreeDocument` 타입 — descendants API 응답에 재사용 가능.
- `tree()` 메서드의 트리 조립 로직 — nodeMap + roots 패턴을 descendants에서 재사용.
- `getRelations()` 메서드의 JOIN 패턴 — documentRelations + documents JOIN을 DAG context에서 확장.
- `inArray()`, `eq()`, `and()` Drizzle 유틸리티 — 기존 쿼리 패턴 일관 유지.

### Established Patterns
- **서비스 팩토리**: `createXxxService(db)` 패턴으로 DI
- **라우트 패턴**: `preHandler: requireRole('viewer')` for read-only
- **에러 처리**: `throw notFound('...')` 패턴
- **응답 구조**: `reply.status(200).send({ ... })` 직접 반환

### Integration Points
- `apps/api/src/routes/categories.ts` — ancestors/descendants 엔드포인트 추가
- `apps/api/src/routes/graph.ts` — DAG context 엔드포인트 추가
- `apps/api/src/services/category-service.ts` — ancestors/descendants 서비스 메서드 추가
- `apps/api/src/services/graph-service.ts` 또는 `relation-service.ts` — DAG context 서비스 메서드 추가

</code_context>

<specifics>
## Specific Ideas

- categoryClosure 테이블이 이미 ancestors/descendants를 효율적으로 지원하므로, 재귀 CTE 대신 closure table 직접 조회가 성능상 유리
- DAG context의 incoming은 `WHERE targetId = :docId`로, outgoing은 `WHERE sourceId = :docId`로 조회 — 기존 getRelations()는 sourceId만 조회하므로 incoming 로직 추가 필요
- tags는 documentTags 테이블에서 LEFT JOIN으로 가져오되, 관련 문서가 많을 때 N+1 방지를 위해 배치 쿼리 사용

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-category-document-context-api*
*Context gathered: 2026-04-13*
