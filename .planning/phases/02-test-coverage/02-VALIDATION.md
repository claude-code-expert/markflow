---
phase: 2
slug: test-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (bundled with apps/api, to be added to packages/editor) |
| **Config file (API)** | `apps/api/vitest.config.ts` |
| **Config file (Editor)** | `packages/editor/vitest.config.ts` (Wave 0에서 생성) |
| **Quick run command (API)** | `pnpm --filter @markflow/api test -- tests/integration/comments.test.ts` |
| **Quick run command (Editor)** | `pnpm --filter @markflow/editor test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command for the relevant package
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | TEST-01 | — | N/A | setup | `pnpm --filter @markflow/api test` | ✅ factory.ts | ⬜ pending |
| 02-01-02 | 01 | 1 | TEST-01 | T-02-01 | authMiddleware 검증 | integration | `pnpm --filter @markflow/api test -- tests/integration/comments.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | TEST-02 | — | N/A | setup | `pnpm --filter @markflow/editor test` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | TEST-02 | — | N/A | unit | `pnpm --filter @markflow/editor test -- src/utils/__tests__/imageValidation.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | TEST-02 | — | N/A | unit | `pnpm --filter @markflow/editor test -- src/utils/__tests__/cloudflareUploader.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/editor/vitest.config.ts` — editor 패키지 vitest 설정 파일
- [ ] `packages/editor/package.json` — `"test": "vitest run"` 스크립트 추가
- [ ] `pnpm --filter @markflow/editor add -D vitest` — vitest devDependency
- [ ] `apps/api/tests/helpers/factory.ts` — `createDocument()`, `createComment()` 헬퍼 추가
- [ ] `apps/api/tests/integration/comments.test.ts` — TEST-01 전체
- [ ] `packages/editor/src/utils/__tests__/imageValidation.test.ts` — TEST-02-a, TEST-02-b
- [ ] `packages/editor/src/utils/__tests__/cloudflareUploader.test.ts` — TEST-02-c, TEST-02-d, TEST-02-e

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
