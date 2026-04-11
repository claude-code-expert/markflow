---
phase: 01-security-auth-hardening
plan: 02
subsystem: api, database, security
tags: [drizzle, inArray, innerJoin, N+1, graph, relations, SVG, security]

requires:
  - phase: none
    provides: existing graph-service and relation-service implementations

provides:
  - Workspace-scoped graph query (inArray-based, no full-table scan)
  - N+1-free getRelations() via single innerJoin query
  - Batch-preloaded detectCycle() with in-memory traversal
  - SVG security separation documentation (Avatar reject / Editor allow)

affects: [01-security-auth-hardening, api-performance, security-documentation]

tech-stack:
  added: []
  patterns:
    - "inArray-based workspace scoping for cross-table queries"
    - "innerJoin for batch document lookup in relation queries"
    - "Batch preload + in-memory traversal for cycle detection"

key-files:
  created: []
  modified:
    - apps/api/src/services/graph-service.ts
    - apps/api/src/services/relation-service.ts
    - apps/api/tests/integration/graph.test.ts
    - apps/api/tests/integration/relations.test.ts
    - docs/SECURITY.md

key-decisions:
  - "inArray(sourceId, docIdArray) AND inArray(targetId, docIdArray) for workspace-scoped relation filtering"
  - "innerJoin with isDeleted=false condition for single-query relation+document lookup"
  - "Batch preload all next relations into Map for O(1) cycle detection traversal"

patterns-established:
  - "inArray workspace scoping: use inArray on both source and target columns to enforce workspace data isolation at DB level"
  - "innerJoin for N+1 elimination: replace for-loop individual selects with single JOIN query"
  - "Batch preload pattern: load all edges once, traverse in-memory instead of per-node DB queries"

requirements-completed: [SEC-03, SEC-04, SEC-05]

duration: 27min
completed: 2026-04-11
---

# Phase 01 Plan 02: Graph/Relation Query Optimization & SVG Security Documentation Summary

**graph-service의 전체 테이블 스캔을 inArray workspace-scoped 쿼리로 교체하고, relation-service N+1을 innerJoin으로 제거하고, detectCycle을 배치 preload 패턴으로 최적화하며, SVG Avatar/Editor 분리 정책을 문서화**

## Performance

- **Duration:** 27 min
- **Started:** 2026-04-11T12:01:50Z
- **Completed:** 2026-04-11T12:29:37Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- graph-service에서 documentRelations 전체 테이블 스캔을 제거하고 inArray 기반 workspace-scoped DB 쿼리로 교체하여 cross-workspace 데이터 격리를 DB 레벨에서 보장
- relation-service getRelations()의 N+1 쿼리 패턴(for 루프 내 개별 SELECT)을 단일 innerJoin 쿼리로 교체하여 쿼리 수를 N+1에서 1로 감소
- relation-service detectCycle()의 while 루프 내 DB 쿼리를 배치 preload + Map 기반 in-memory 탐색으로 교체하여 DB 왕복을 1회로 감소
- SECURITY.md에 SVG Avatar 거부 / Editor 허용 분리 정책을 규칙 + 근거 형태로 문서화

## Task Commits

Each task was committed atomically:

1. **Task 1: graph-service workspace 범위 쿼리 최적화** - `f105198` (refactor)
2. **Task 2: relation-service N+1 제거 + detectCycle 배치 최적화** - `00dca6f` (refactor)
3. **Task 3: SECURITY.md SVG 분리 규칙 문서화** - `5a0f69d` (docs)

## Files Created/Modified
- `apps/api/src/services/graph-service.ts` - 전체 테이블 스캔을 inArray 기반 workspace-scoped 쿼리로 교체
- `apps/api/src/services/relation-service.ts` - getRelations() innerJoin 교체 + detectCycle() 배치 preload
- `apps/api/tests/integration/graph.test.ts` - cross-workspace relation isolation 테스트 추가
- `apps/api/tests/integration/relations.test.ts` - soft-deleted 문서 relation 필터링 테스트 추가
- `docs/SECURITY.md` - SVG Avatar/Editor 분리 정책 규칙 + 근거 섹션 추가

## Decisions Made
- inArray를 sourceId와 targetId 모두에 적용하여 workspace 소속 문서 간의 relation만 조회 (subquery 대신 inArray 선택 - 코드 가독성과 Drizzle ORM 호환성)
- innerJoin에 isDeleted=false 조건을 포함하여 삭제된 문서를 자동 필터링 (LEFT JOIN이 아닌 INNER JOIN으로 삭제된 문서의 relation을 완전히 제외)
- detectCycle에서 전체 next relation을 한 번에 로드하는 배치 패턴 선택 (MVP 규모에서 충분, 향후 workspace scope 필터 추가 가능)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 테스트 DB(`markdown_web_test`)가 존재하지 않아 postgres 슈퍼유저로 DB를 생성해야 했음. `markdown` 유저에 CREATEDB 권한이 없어 postgres 유저로 연결하여 해결.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- graph-service와 relation-service의 쿼리 최적화가 완료되어 향후 대규모 데이터에서도 안정적 동작 가능
- SVG 보안 정책이 문서화되어 있으므로 Avatar 업로드 API 구현 시 참조 가능
- Avatar 업로드 API의 SVG MIME 거부 로직은 아직 구현 전 (체크리스트에 미완료로 표시)

## Self-Check: PASSED

- All 5 modified files exist on disk
- All 3 task commits verified (f105198, 00dca6f, 5a0f69d)
- graph-service.ts: inArray sourceId (1), inArray targetId (1), allRelations (0), docIds.has (0)
- relation-service.ts: innerJoin (1), nextMap (4), no await in loops
- SECURITY.md: Avatar SVG 거부 (2 matches), Editor SVG 허용 (1 match), rehype-sanitize (5 matches)

---
*Phase: 01-security-auth-hardening*
*Completed: 2026-04-11*
