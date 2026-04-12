---
phase: 01-security-auth-hardening
verified: 2026-04-11T22:05:30Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "PasswordChangeModal 전체 플로우 시각적 검증 (Task 4: checkpoint:human-verify)"
    expected: "설정 페이지에서 비밀번호 변경 버튼 클릭 시 모달 열림, 3개 입력 필드, 실시간 hint pills, 성공/실패 분기, Escape 닫기 동작"
    why_human: "01-04 Plan Task 4는 blocking human-verify checkpoint로 명시됨. SUMMARY에 '사용자 시각적 검증 승인됨' 체크가 있으나 Plan 명세 상 반드시 실제 브라우저에서 사용자가 직접 승인해야 한다"
---

# Phase 01: Security & Auth Hardening 검증 보고서

**Phase Goal:** 외부 공격 표면을 차단하고 인증/인가 기반을 완성하여, 이후 모든 기능이 안전한 인프라 위에서 동작한다
**검증일:** 2026-04-11T22:05:30Z
**상태:** human_needed
**재검증:** No — 최초 검증

---

## 목표 달성 여부

### Observable Truths (ROADMAP 성공 기준)

| # | Truth | 상태 | 근거 |
|---|-------|------|------|
| 1 | R2 Worker에 ALLOWED_ORIGINS에 없는 origin에서 업로드 요청 시 CORS 에러가 반환된다 | VERIFIED | `helpers.ts`: `const allowed = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []` — wildcard 없음, fail-closed. worker 유닛 테스트 11개 통과 |
| 2 | R2 Worker에 API_SECRET 설정 시 Bearer 토큰 없는 업로드가 403으로 거부된다 | VERIFIED | `helpers.ts:checkAuth()` 구현 완료, `index.ts:31` 에서 `/upload` POST 핸들러에 연결됨. Test 7, 8 통과 확인 |
| 3 | 로그인한 사용자가 현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있다 | VERIFIED | `auth-service.ts:changePassword()` 구현, `users.ts:124` PUT `/me/password` 라우트 등록, 8개 통합 테스트 작성 (DB 미연결로 실행 불가하나 코드 구현 완료, TypeScript 컴파일 에러 없음) |
| 4 | graph-service가 워크스페이스 소속 문서의 relation만 조회하고, relation-service가 JOIN 기반 배치 쿼리를 사용한다 | VERIFIED | `graph-service.ts:66-67` `inArray(documentRelations.sourceId, docIdArray)` AND `inArray(documentRelations.targetId, docIdArray)`. `relation-service.ts:249` `innerJoin` 사용, detectCycle은 배치 preload + Map. cross-workspace isolation 테스트 존재 |
| 5 | SECURITY.md에 Avatar(SVG 거부)/Editor(SVG 허용) 분리 근거와 렌더링 규칙이 명시되어 있다 | VERIFIED | `docs/SECURITY.md:31-58` "SVG 파일 보안 — Avatar/Editor 분리 정책" 섹션, 테이블 + 근거 + 구현 체크리스트 포함 |

**점수:** 5/5 truths VERIFIED

---

### 필수 아티팩트

| 아티팩트 | 설명 | 존재 | 실질성 | 연결 | 상태 |
|---------|------|------|--------|------|------|
| `apps/worker/src/helpers.ts` | R2 Worker CORS strict + Bearer auth | O | O (84줄, corsHeaders/checkAuth 순수 함수) | O (index.ts에서 import + 사용) | VERIFIED |
| `apps/worker/src/index.ts` | Worker fetch 핸들러 | O | O | O | VERIFIED |
| `apps/worker/tests/worker-logic.test.ts` | Worker 유닛 테스트 | O | O (163줄, 11개 테스트) | O (vitest 통과 확인) | VERIFIED |
| `apps/api/src/routes/upload-token.ts` | GET /api/v1/upload-token | O | O (authMiddleware 적용, R2_UPLOAD_SECRET 조건부) | O (index.ts:120 등록) | VERIFIED |
| `apps/api/src/services/graph-service.ts` | workspace-scoped relation 쿼리 | O | O (inArray 2개 사용, allRelations 변수 없음) | O (워크스페이스 라우트에서 사용) | VERIFIED |
| `apps/api/src/services/relation-service.ts` | JOIN 기반 getRelations + 배치 detectCycle | O | O (innerJoin, nextMap 사용, while 루프 내 await db 없음) | O | VERIFIED |
| `docs/SECURITY.md` | SVG 분리 정책 문서화 | O | O (Avatar 거부/Editor 허용 테이블, 근거 섹션) | O (SECURITY.md 독립 문서) | VERIFIED |
| `apps/api/src/services/auth-service.ts` | changePassword 메서드 | O | O (db.transaction, tx.delete refreshTokens, tx.insert refreshTokens, ACCOUNT_LOCKED) | O (users.ts에서 createAuthService 호출) | VERIFIED |
| `apps/api/src/routes/users.ts` | PUT /me/password 라우트 | O | O (app.put, /me/password, setCookie refreshToken) | O | VERIFIED |
| `apps/api/tests/integration/password-change.test.ts` | 비밀번호 변경 통합 테스트 | O | O (343줄, 8개 테스트) | O (실행 환경 미비 — DB 없음) | VERIFIED (코드 완료) |
| `apps/web/components/password-change-modal.tsx` | PasswordChangeModal 컴포넌트 | O | O (497줄, named export, apiFetch 연동) | O (settings/page.tsx 연결) | VERIFIED |
| `apps/web/components/__tests__/password-change-modal.test.tsx` | PasswordChangeModal 유닛 테스트 | O | O (7개 테스트) | O (vitest 통과 — 7/7) | VERIFIED |
| `apps/web/app/(app)/[workspaceSlug]/settings/page.tsx` | 설정 페이지 모달 연동 | O | O (PasswordChangeModal import, isPasswordModalOpen state, 버튼) | O | VERIFIED |

---

### 핵심 연결 (Key Links)

| From | To | Via | 상태 | 세부 |
|------|----|----|------|------|
| `apps/worker/src/index.ts` | `Env.API_SECRET` | Bearer token 비교 | WIRED | `checkAuth(request, env, cors)` 호출, `env.API_SECRET` 검사 |
| `apps/worker/src/index.ts` | `Env.ALLOWED_ORIGINS` | origin matching (wildcard 없음) | WIRED | `allowed.includes(origin)` — `?? []` fail-closed |
| `apps/api/src/services/graph-service.ts` | `documentRelations` table | `inArray(sourceId)` AND `inArray(targetId)` | WIRED | 두 컬럼 모두 inArray 적용 |
| `apps/api/src/services/relation-service.ts` | `documents` table | `innerJoin` for batch document lookup | WIRED | `innerJoin(documents, and(eq(targetId, documents.id), eq(isDeleted, false)))` |
| `apps/api/src/routes/users.ts` | `auth-service.changePassword` | PUT `/me/password` 핸들러 | WIRED | `authService.changePassword(Number(request.currentUser.userId), ...)` |
| `apps/api/src/services/auth-service.ts` | `refreshTokens` table | `db.transaction` DELETE + INSERT | WIRED | `tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId))` + insert |
| `apps/web/components/password-change-modal.tsx` | `PUT /api/v1/users/me/password` | `apiFetch('/users/me/password', ...)` | WIRED | `apiFetch<PasswordChangeResponse>('/users/me/password', { method: 'PUT', ... })` |
| `apps/web/components/password-change-modal.tsx` | toast-store | 성공 토스트 | WIRED | `addToast({ message: '비밀번호가 변경되었습니다', type: 'success' })` |

---

### 데이터 플로우 추적 (Level 4)

| 아티팩트 | 데이터 변수 | 소스 | 실데이터 여부 | 상태 |
|---------|-----------|------|--------------|------|
| `PasswordChangeModal` | `apiError`, `onClose` 결과 | `apiFetch('/users/me/password')` | O (실제 API 호출, mock 아님) | FLOWING |
| `graph-service.getWorkspaceGraph` | `relations` | `db.select().from(documentRelations).where(inArray...)` | O (DB 쿼리 결과) | FLOWING |
| `relation-service.getRelations` | `rows` | `db.select().from(documentRelations).innerJoin(documents,...)` | O (실제 JOIN 쿼리) | FLOWING |
| `auth-service.changePassword` | 새 토큰 | `signTokenPair(...)` + `db.transaction(...)` | O (atomic 트랜잭션) | FLOWING |

---

### 행동 검증 (Behavioral Spot-Checks)

| 동작 | 명령 | 결과 | 상태 |
|------|------|------|------|
| Worker 유닛 테스트 11개 통과 | `npx vitest run --config apps/worker/vitest.config.ts` | 11 tests passed | PASS |
| PasswordChangeModal 유닛 테스트 7개 통과 | `pnpm --filter @markflow/web test` | 7 tests passed (96 total) | PASS |
| 통합 테스트 (password-change) | DB 미연결 (`markdown_web_test` 없음) | 실행 불가 | SKIP (인프라 문제) |
| TypeScript 컴파일 | 코드 구현 완료, SUMMARY Self-Check PASSED 확인 | 에러 없음 | PASS |

---

### 요구사항 커버리지

| 요구사항 | 소스 플랜 | 설명 | 상태 | 근거 |
|---------|---------|------|------|------|
| SEC-01 | 01-01 | R2 Worker ALLOWED_ORIGINS CORS | SATISFIED | `helpers.ts:corsHeaders()` — `?? []` fail-closed, wildcard 제거 |
| SEC-02 | 01-01 | R2 Worker API_SECRET Bearer 인증 | SATISFIED | `helpers.ts:checkAuth()` — API_SECRET 조건부 Bearer 검증, 401→403 |
| SEC-03 | 01-02 | SECURITY.md SVG 분리 문서화 | SATISFIED | `docs/SECURITY.md:31-58` — 테이블 + 근거 섹션 완비 |
| SEC-04 | 01-02 | graph-service workspace 범위 쿼리 | SATISFIED | `graph-service.ts:66-67` — inArray 두 컬럼, JS 필터 제거 |
| SEC-05 | 01-02 | relation-service JOIN 배치 쿼리 | SATISFIED | `relation-service.ts:249` innerJoin, detectCycle nextMap 배치 |
| AUTH-01 | 01-03, 01-04 | 비밀번호 변경 (백엔드 + 프론트엔드) | SATISFIED | PUT /me/password API + PasswordChangeModal 완성 |

**참고:** REQUIREMENTS.md의 Phase 1 요구사항(AUTH-01, SEC-01~05) 체크박스가 `[ ]`로 남아 있음 — 코드는 구현되었으나 REQUIREMENTS.md 업데이트가 누락됨. 기능적 검증에는 영향 없음.

---

### 안티패턴 탐지

| 파일 | 라인 | 패턴 | 심각도 | 영향 |
|------|------|------|--------|------|
| `password-change-modal.tsx` | 251 | `return null` (isOpen=false 시) | INFO | 정상 패턴 — 닫힌 모달은 null 반환이 올바름 |
| `password-change-modal.tsx` | 385, 413, 455 | `placeholder="..."` | INFO | UX placeholder — stub 아님, 정상 UI 텍스트 |
| `apps/api/tests/integration/` | (전체) | DB 없어 통합 테스트 실행 불가 | WARNING | `markdown_web_test` DB 미존재 — 로컬 환경 인프라 문제. 코드 자체 결함 아님 |
| `REQUIREMENTS.md` | 12-20, 94-99 | 모든 Phase 1 항목 `[ ]` + `Pending` | INFO | 구현 완료 후 REQUIREMENTS.md 체크박스 미업데이트 — 기능 동작에 무관 |

**블로커 안티패턴:** 없음

---

### 사람 검증 필요 항목

#### 1. 비밀번호 변경 플로우 시각적 검증

**테스트:** 개발 서버(`pnpm dev`) 실행 후 아래 순서로 검증
1. 로그인 후 워크스페이스 설정 페이지 이동
2. "비밀번호 변경" 버튼이 보이는지 확인
3. 버튼 클릭 → 모달 열림 확인
4. 3개 입력 필드 (현재 비밀번호, 새 비밀번호, 새 비밀번호 확인) 확인
5. 새 비밀번호 입력 시 hint pills(8자 이상/영문 포함/숫자 포함/특수문자 포함) 실시간 변화 확인
6. 잘못된 현재 비밀번호 → "현재 비밀번호가 올바르지 않습니다." 빨간 알림 확인
7. 올바른 비밀번호로 변경 → "비밀번호가 변경되었습니다" 토스트 + 모달 닫힘 확인
8. 변경된 비밀번호로 재로그인 가능한지 확인
9. Escape 키로 모달 닫기 확인

**예상:** 각 단계에서 설명한 동작이 그대로 발생해야 함
**사람 필요 이유:** 01-04 Plan Task 4는 `type="checkpoint:human-verify" gate="blocking"` 명세. SUMMARY에 "사용자 시각적 검증 승인됨" 체크가 있으나, 이는 Plan 실행 시 동일 세션에서 기록된 자체 확인임. 독립적 검증자(개발자)가 직접 확인 후 승인해야 이 gate가 닫힘.

---

### 갭 요약

자동화 검증 가능한 모든 must-have가 VERIFIED되었습니다. 코드 구현, 연결, 데이터 플로우 모두 정상.

**유일한 미결 항목:** 01-04 Plan의 human-verify blocking checkpoint — 브라우저에서 사용자가 직접 비밀번호 변경 플로우를 테스트하고 승인해야 합니다.

**참고사항 (블로커 아님):**
- 통합 테스트 DB(`markdown_web_test`) 미연결 — 환경 인프라 문제. 코드는 완성됨.
- REQUIREMENTS.md 체크박스가 `[ ]`로 남아 있음 — Phase 1 완료 후 업데이트 권장.

---

_검증일: 2026-04-11T22:05:30Z_
_검증자: Claude (gsd-verifier)_
