---
phase: 03-category-document-context-api
plan: 01
subsystem: api/categories
tags: [category, ancestors, descendants, closure-table, rest-api]
dependency_graph:
  requires: [categoryClosure table, categories table, documents table]
  provides: [GET /categories/:id/ancestors, GET /categories/:id/descendants]
  affects: [apps/api/src/services/category-service.ts, apps/api/src/routes/categories.ts]
tech_stack:
  added: []
  patterns: [closure-table-query, nodeMap-tree-assembly]
key_files:
  created:
    - apps/api/tests/integration/category-context.test.ts
  modified:
    - apps/api/src/services/category-service.ts
    - apps/api/src/routes/categories.ts
decisions:
  - "ancestors: depth DESC ordering for root-to-leaf display (breadcrumb order)"
  - "descendants: reuse CategoryTreeNode type and nodeMap pattern from existing tree() method"
  - "descendants: separate query for direct documents of target category"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-13T09:39:00Z"
  tasks: 2
  tests_added: 10
  tests_total_pass: 25
---

# Phase 03 Plan 01: Category Ancestors/Descendants API Summary

Closure table 기반 ancestors/descendants read-only API 구현. breadcrumb 렌더링용 ancestors(root-to-leaf 정렬)와 하위 트리 렌더링용 descendants(nested tree + documents) 엔드포인트 추가.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | ancestors() service + route + tests | 3863ad7, 64ae2b7 | TDD: 5 tests RED then GREEN. closure table depth DESC query, workspace isolation |
| 2 | descendants() service + route + tests | 9f1d574, da55232 | TDD: 5 tests RED then GREEN. nodeMap tree assembly, soft-delete exclusion |

## Implementation Details

### ancestors()
- Queries `categoryClosure` JOIN `categories` where `descendantId = target` and `depth > 0`
- Orders by `depth DESC` so root appears first (breadcrumb-friendly)
- Returns array of `{ id, name, parentId, depth, createdAt }`
- Workspace isolation: validates category belongs to workspace before querying

### descendants()
- Step 1: Get descendant IDs from closure table (`ancestorId = target`, `depth > 0`)
- Step 2: Fetch category details with workspace filter
- Step 3: Fetch active documents (`isDeleted = false`) with workspace filter
- Step 4: Build nested tree using nodeMap pattern (reuses `CategoryTreeNode` type)
- Returns `{ children: CategoryTreeNode[], documents: CategoryTreeDocument[] }`

### Routes
- `GET /workspaces/:wsId/categories/:id/ancestors` — `requireRole('viewer')`
- `GET /workspaces/:wsId/categories/:id/descendants` — `requireRole('viewer')`

## Test Coverage

10 new integration tests in `category-context.test.ts`:

**Ancestors (5):**
1. 3-depth chain returns [Root, Mid] in root-to-leaf order
2. Each ancestor includes id, name, parentId, depth, createdAt
3. Root category returns empty array
4. Non-existent category returns 404
5. Different workspace category returns 404 (isolation)

**Descendants (5):**
1. 3-depth chain returns nested tree structure
2. Category nodes include documents array
3. Leaf category returns empty children/documents
4. Soft-deleted documents excluded
5. Different workspace category returns 404 (isolation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed soft-delete status code in test**
- **Found during:** Task 2, TDD RED phase
- **Issue:** Test expected document DELETE to return 200, but the actual endpoint returns 204
- **Fix:** Changed `expect(deleteRes.statusCode).toBe(200)` to `.toBe(204)`
- **Files modified:** apps/api/tests/integration/category-context.test.ts

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-03-01 | All category queries include `eq(categories.workspaceId, numWorkspaceId)` | Test 5 (ancestors), Test 5 (descendants) |
| T-03-02 | Documents query includes `eq(documents.isDeleted, false)` and `eq(documents.workspaceId, numWorkspaceId)` | Test 4 (descendants) |
| T-03-04 | Both routes use `requireRole('viewer')` preHandler | Route code inspection |

## Self-Check: PASSED

- All 4 files exist (3 source/test + 1 summary)
- All 4 commits found (3863ad7, 64ae2b7, 9f1d574, da55232)
- All acceptance criteria met (ancestors, descendants, depth filters, routes, 10 tests)
- 25/25 tests pass (10 new + 15 existing, no regressions)
