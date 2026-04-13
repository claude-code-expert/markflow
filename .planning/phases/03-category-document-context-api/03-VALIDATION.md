---
phase: 3
slug: category-document-context-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @markflow/api test -- --run` |
| **Full suite command** | `pnpm --filter @markflow/api test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @markflow/api test -- --run`
- **After every plan wave:** Run `pnpm --filter @markflow/api test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CAT-01 | T-03-01 | workspaceId 필터로 타 워크스페이스 ancestors 차단 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/category-context.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CAT-01 | — | ancestors 404 for invalid category | integration | 위와 동일 | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CAT-02 | T-03-01 | workspaceId 필터로 타 워크스페이스 descendants 차단 | integration | 위와 동일 | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CAT-02 | — | descendants 빈 트리 for leaf category | integration | 위와 동일 | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | DOC-01 | T-03-02 | workspaceId + isDeleted 필터로 삭제된 문서 제외 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/dag-context.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | DOC-01 | — | incoming/outgoing/related 3분류 정확성 | integration | 위와 동일 | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | DOC-02 | T-03-02 | title + categoryName + tags 포함 확인 | integration | 위와 동일 | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | DOC-02 | — | 워크스페이스 격리 (타 워크스페이스 문서 미포함) | integration | 위와 동일 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/integration/category-context.test.ts` — stubs for CAT-01, CAT-02
- [ ] `apps/api/tests/integration/dag-context.test.ts` — stubs for DOC-01, DOC-02
- 기존 test helper (`factory.ts`, `setup.ts`) 재사용 가능

*Existing infrastructure covers test framework setup. Only test files need creation.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
