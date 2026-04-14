---
phase: 02-test-coverage
plan: 01
subsystem: testing
tags: [vitest, fastify, integration-test, comments, rbac]

# Dependency graph
requires:
  - phase: 01-security-auth-hardening
    provides: auth middleware, RBAC, comment CRUD endpoints
provides:
  - createDocument() and createComment() factory helpers for test reuse
  - 13 comment CRUD integration tests covering 7 scenarios
affects: [02-02, future API test plans]

# Tech tracking
tech-stack:
  added: []
  patterns: [factory helper for API-based document creation via app.inject(), DB-direct comment creation for fast test setup]

key-files:
  created:
    - apps/api/tests/integration/comments.test.ts
  modified:
    - apps/api/tests/helpers/factory.ts

key-decisions:
  - "createDocument uses app.inject() (not DB insert) to preserve business logic like slug generation"
  - "createComment uses DB direct insert for speed since comment creation has minimal side effects"

patterns-established:
  - "CommentResponse interface for typed test assertions"
  - "commentUrl() helper for consistent URL construction in comment tests"

requirements-completed: [TEST-01]

# Metrics
duration: 19min
completed: 2026-04-13
---

# Phase 02 Plan 01: Comment CRUD Integration Tests Summary

**13 integration tests across 7 scenarios (create/list/update/delete/resolve/permissions/threading) with factory helpers for reusable test setup**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-13T07:58:41Z
- **Completed:** 2026-04-13T08:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added createDocument() and createComment() factory helpers to reduce test boilerplate
- Created 13 integration tests covering all 7 comment CRUD scenarios
- Validated RBAC enforcement (viewer 403, author-only edit/delete 403, unauthenticated 401)
- Verified comment threading with parentId and invalid parentId handling

## Task Commits

Each task was committed atomically:

1. **Task 1: factory.ts helper functions** - `0d7a63c` (feat)
2. **Task 2: comments.test.ts 7 scenarios** - `e7ac1d0` (test)

## Files Created/Modified
- `apps/api/tests/helpers/factory.ts` - Added createDocument(), createComment() with FastifyInstance and comments imports
- `apps/api/tests/integration/comments.test.ts` - 13 tests across 7 describe blocks (T127)

## Decisions Made
- createDocument uses app.inject() to preserve API business logic (slug, version init) rather than DB direct insert
- createComment uses DB direct insert for speed since it has no significant side effects beyond row creation
- Used typed CommentResponse interface for all test assertions (no `any`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied missing DB migration for resolved column on test database**
- **Found during:** Task 2 (running comments.test.ts)
- **Issue:** Test DB was missing `resolved` and `resolved_by` columns on `comments` table. Migration 0003_add_comment_resolved.sql existed but had not been applied to the test database.
- **Fix:** Applied the migration SQL (`ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved...`) to the test database
- **Files modified:** None (database schema change only)
- **Verification:** All 13 tests passed after migration
- **Committed in:** N/A (runtime DB change, not a code change)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration was necessary for tests to run. No scope creep.

## Issues Encountered
- Worktree git state confusion: parallel agent committed on the same branch, causing initial commit to be lost. Re-applied changes on the correct HEAD.
- vitest CLI argument `-- tests/integration/comments.test.ts` ran all test files (not just the specified one) due to pnpm filter behavior. Used `npx vitest run tests/integration/comments.test.ts` directly for targeted execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- factory.ts helpers (createDocument, createComment) available for future test plans
- Comment CRUD regression coverage complete, safe to modify comment-related code

## Self-Check: PASSED

- factory.ts: FOUND, contains createDocument (1) and createComment (1)
- comments.test.ts: FOUND, contains 8 describe blocks
- Commits 0d7a63c and e7ac1d0: FOUND in git log
- SUMMARY.md: FOUND

---
*Phase: 02-test-coverage*
*Completed: 2026-04-13*
