---
phase: 01
slug: security-auth-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 01-01-01 | 01 | 1 | SEC-01 | T-01-01 | CORS strict: 미허용 origin 차단 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/worker-cors.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | SEC-02 | T-01-02 | Bearer 토큰 없는 업로드 403 거부 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/worker-auth.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | T-01-03 | 비밀번호 변경 + 세션 무효화 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/password-change.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | SEC-04 | — | workspace 범위 쿼리만 실행 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/graph.test.ts` | ✅ (확장 필요) | ⬜ pending |
| 01-03-02 | 03 | 2 | SEC-05 | — | N+1 제거, JOIN 배치 쿼리 | integration | `pnpm --filter @markflow/api test -- --run tests/integration/relations.test.ts` | ✅ (확장 필요) | ⬜ pending |
| 01-04-01 | 04 | 2 | SEC-03 | — | SVG 분리 규칙 문서화 | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/integration/password-change.test.ts` — AUTH-01 비밀번호 변경 통합 테스트 스텁
- [ ] Worker 테스트 인프라 — SEC-01/SEC-02 corsHeaders, auth check 함수를 export하여 unit test
- [ ] `apps/api/tests/integration/graph.test.ts` — workspace 범위 쿼리 검증 추가
- [ ] `apps/api/tests/integration/relations.test.ts` — N+1 제거 검증 추가

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SECURITY.md SVG 분리 규칙 문서화 | SEC-03 | 문서 내용 검증은 사람이 읽어야 함 | SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거 섹션이 존재하는지 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
