# Phase 2: Test Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 02-test-coverage
**Areas discussed:** 이미지 업로드 테스트 전략, 댓글 테스트 범위, 테스트 인프라 & 격리, 커버리지 기준

---

## 이미지 업로드 테스트 전략

| Option | Description | Selected |
|--------|-------------|----------|
| API 엔드포인트만 테스트 | upload-token 발급 API만 통합 테스트. Worker 자체는 별도 or 수동 검증. | |
| Worker도 통합 테스트 | miniflare로 Worker 로컬 실행, 전체 업로드 플로우 E2E 검증. | |
| 클라이언트 검증 로직만 | validateImageFile() 등 클라이언트 검증 유틸만 단위 테스트. Worker/API 제외. | ✓ |

**User's choice:** 클라이언트 검증 로직만
**Notes:** Worker와 API는 테스트 범위에서 제외. 클라이언트 유틸리티 함수에 집중.

### 테스트 시나리오 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 타입/크기/에러만 | validateImageFile() 단위 테스트. CORS/성공 업로드는 TEST-02에서 제외. | |
| 5개 모두 커버 | CORS/성공 업로드도 fetch mock으로 테스트. cloudflareUploader 응답 처리 로직까지 검증. | ✓ |

**User's choice:** 5개 모두 커버
**Notes:** fetch mock을 사용하여 CORS와 성공 업로드 시나리오도 포함.

---

## 댓글 테스트 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 파일 | comments.test.ts 하나에 describe 블록으로 그룹화. 기존 패턴과 동일. | ✓ |
| 기능별 분리 | comments-crud.test.ts, comments-permissions.test.ts 등으로 분리. | |

**User's choice:** 단일 파일
**Notes:** 기존 통합 테스트 패턴(auth-login.test.ts 등)과 일관성 유지.

### Phase 1 보안 변경 검증

| Option | Description | Selected |
|--------|-------------|----------|
| 권한 시나리오에 포함 | 7개 시나리오 중 '권한'에서 viewer/editor/admin 역할별 접근 제어 검증. | ✓ |
| 별도 보안 테스트 추가 | comments-security.test.ts 별도 작성. 타 워크스페이스 접근 등 엣지 케이스 포함. | |

**User's choice:** 권한 시나리오에 포함
**Notes:** 별도 보안 테스트 파일 불필요.

---

## 테스트 인프라 & 격리

| Option | Description | Selected |
|--------|-------------|----------|
| factory 확장 | createComment(), createDocument() 등 헬퍼 함수 추가. 기존 createUser() 패턴. | ✓ |
| 테스트 내부에서 직접 생성 | 각 테스트에서 app.inject()로 직접 데이터 생성. 헬퍼 의존성 없음. | |

**User's choice:** factory 확장

### DB 격리 전략

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 패턴 유지 | setup.ts의 beforeAll/afterAll로 DB 초기화. 기존 30+개 테스트와 동일. | ✓ |
| 트랜잭션 롤백 도입 | 각 테스트를 트랜잭션으로 감싸고 롤백. 간섭 제거되지만 방식 상이. | |

**User's choice:** 기존 패턴 유지

---

## 커버리지 기준

| Option | Description | Selected |
|--------|-------------|----------|
| 시나리오 통과만 | TEST-01 7개, TEST-02 5개 시나리오 전부 통과 기준. 커버리지 % 미추적. | ✓ |
| 커버리지 % 게이트 설정 | Vitest coverage로 80%+ 라인/브랜치 커버리지 강제. CI에서 미달 시 실패. | |
| 두 가지 모두 | 시나리오 통과 + 커버리지 80% 게이트. 가장 엄격. | |

**User's choice:** 시나리오 통과만
**Notes:** 코드 커버리지 수치는 추적하지 않음.

---

## Claude's Discretion

- 댓글 테스트 내 각 시나리오의 구체적 assertion 설계
- fetch mock 구현 방식 (vitest mock vs msw)
- factory 함수의 매개변수 설계 및 기본값
- 테스트 데이터의 구체적 값

## Deferred Ideas

None — discussion stayed within phase scope
