---
phase: 01
slug: security-auth-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @markflow/api test -- --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @markflow/api test -- --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | SEC-01 | T-01-01 | CORS strict: 미허용 origin 차단 | unit | `npx vitest run --config apps/worker/vitest.config.ts` | ✅ worker-logic.test.ts (15 tests) | ✅ green |
| 01-01-02 | 01 | 1 | SEC-02 | T-01-02 | Bearer 토큰 없는 업로드 403 거부 | unit | `npx vitest run --config apps/worker/vitest.config.ts` | ✅ worker-logic.test.ts (포함) | ✅ green |
| 01-02-01 | 02 | 1 | AUTH-01 | T-01-11 | 비밀번호 변경 + 세션 무효화 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/password-change.test.ts` | ✅ password-change.test.ts (8 tests) | ✅ green |
| 01-03-01 | 03 | 1 | SEC-04 | T-01-08 | workspace 범위 쿼리만 실행 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/graph.test.ts` | ✅ graph.test.ts (cross-workspace isolation) | ✅ green |
| 01-03-02 | 03 | 1 | SEC-05 | T-01-07 | N+1 제거, JOIN 배치 쿼리 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/relations.test.ts` | ✅ relations.test.ts (soft-delete filter) | ✅ green |
| 01-04-01 | 04 | 2 | SEC-03 | T-01-09 | SVG 분리 규칙 문서화 | manual-only | N/A | ✅ docs/SECURITY.md 확인됨 | ✅ green |
| 01-04-02 | 04 | 2 | AUTH-01 | T-01-17 | 비밀번호 변경 UI | unit | `pnpm --filter @markflow/web test` | ✅ password-change-modal.test.tsx (7 tests) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/api/tests/integration/password-change.test.ts` — AUTH-01 비밀번호 변경 통합 테스트 (8 tests)
- [x] `apps/worker/tests/worker-logic.test.ts` — SEC-01/SEC-02 corsHeaders, checkAuth unit test (15 tests)
- [x] `apps/api/tests/integration/graph.test.ts` — cross-workspace isolation 검증 추가됨
- [x] `apps/api/tests/integration/relations.test.ts` — soft-delete filter 검증 추가됨
- [x] `apps/web/components/__tests__/password-change-modal.test.tsx` — UI 컴포넌트 테스트 (7 tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SECURITY.md SVG 분리 규칙 문서화 | SEC-03 | 문서 내용 검증은 사람이 읽어야 함 | SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거 섹션이 존재하는지 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-04-12)

## Validation Audit 2026-04-12
| Metric | Count |
|--------|-------|
| Requirements | 7 |
| Covered (automated) | 6 |
| Covered (manual-only) | 1 |
| Gaps | 0 |
