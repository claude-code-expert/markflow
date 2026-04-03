# KMS 통합 테스트 + Diff 기능 구현 계획

> 작성일: 2026-04-02

## 기능 요약

"agent" 워크스페이스를 기준으로 KMS의 전체 CRUD 플로우(카테고리, 문서, 태그, 관계, 버전, 휴지통)를
하나의 통합 테스트 스위트에서 end-to-end로 검증하고, 현재 version-history-modal.tsx에
이미 구현된 diff 렌더링 로직의 부족한 부분(버전 간 비교 선택, content 반환 누락)을 보완한다.

---

## 현재 상태 분석

### 이미 존재하는 테스트 (apps/api/tests/integration/)
| 파일 | 범위 |
|------|------|
| categories.test.ts | 카테고리 CRUD + 계층 + 중복 검증 |
| documents.test.ts | 문서 CRUD + 버전 생성 + FIFO 20개 |
| relations.test.ts | prev/next/related 양방향 + 한도 |
| tags.test.ts | PUT tags + GET workspace tags + 한도 |
| trash.test.ts | soft delete + restore + permanent delete |

### 발견된 Gap
1. **카테고리 이동 미지원**: `PATCH /documents/:id`의 `UpdateData` 인터페이스에 `categoryId`가 없음. 문서를 다른 폴더로 이동하는 API가 현재 존재하지 않음.
2. **버전 API content 미반환**: `getVersions()`가 `id`, `version`, `createdAt`만 반환하고 `content`를 반환하지 않음. 프론트엔드 `version-history-modal.tsx`의 `Version` 인터페이스는 `content`를 기대하지만 API가 이를 제공하지 않음.
3. **기존 테스트들이 개별 단위**: 전체 워크플로우를 하나의 시나리오로 검증하는 통합 테스트 없음.
4. **프론트엔드 diff 테스트 스텁**: `__tests__/components/version-history-modal.test.tsx`가 모두 `expect(true).toBe(true)` 상태.
5. **문서 생성 API 응답 불일치**: `POST /documents` 응답이 `{ document: {...} }` 래핑으로 반환되지만, 일부 기존 테스트(`documents.test.ts`)는 `res.json()` 직접 접근. 반면 `tags.test.ts`와 `relations.test.ts`는 `{ document: { id } }` 구조 사용. 신규 테스트는 래핑 구조 확인 필요.

---

## 유저 스토리

### US-001: KMS 전체 플로우 통합 테스트

**As a** 개발자,
**I want to** 하나의 테스트 스위트에서 KMS 전체 기능(폴더 CRUD, 문서 CRUD, 태그, 카테고리 이동, 관계, 버전, 휴지통)을 순차적으로 검증하고 싶다,
**So that** 기능 간 상호작용과 데이터 정합성을 한번에 확인할 수 있다.

**Acceptance Criteria:**
- [ ] Given "agent" 워크스페이스가 생성되었을 때, when 카테고리 3개(루트 2 + 자식 1)를 생성하면, then 각각 201로 성공하고 closure 테이블에 depth 올바르게 기록됨
- [ ] Given 카테고리가 존재할 때, when docs/sample/ 파일 8개의 컨텐츠로 문서를 생성하면, then 각 문서에 v1이 생성됨
- [ ] Given 문서가 존재할 때, when 태그 5개를 설정하면, then 200으로 성공하고 GET tags에서 조회 가능
- [ ] Given 문서가 존재할 때, when categoryId를 변경하여 다른 폴더로 이동하면, then 문서의 categoryId가 갱신됨
- [ ] Given 문서 2개가 존재할 때, when prev/next/related 관계를 설정하면, then 양방향 관계 확인 가능
- [ ] Given 문서를 3번 수정했을 때, when 버전 목록을 조회하면, then v1~v4 총 4개 버전이 content와 함께 반환됨
- [ ] Given 관계가 설정된 문서를 수정했을 때, when 관계를 다시 조회하면, then 관계가 유지됨
- [ ] Given 문서를 삭제(soft delete)했을 때, when 문서 목록과 휴지통을 조회하면, then 문서 목록에서 사라지고 휴지통에 표시됨
- [ ] Given 휴지통의 문서를 복원했을 때, when 문서 목록을 조회하면, then 다시 표시됨
- [ ] Given 문서를 다시 삭제 후 영구 삭제했을 때, when DB를 직접 조회하면, then 문서와 버전 모두 제거됨

**Technical Notes:**
- 테스트 파일: `apps/api/tests/integration/kms-full-flow.test.ts`
- 기존 `setup.ts`의 `getApp()`, `getDb()`와 `factory.ts`의 `createUser()`, `createWorkspace()` 활용
- `docs/sample/` 8개 파일의 실제 마크다운 컨텐츠를 `fs.readFileSync`로 읽어 테스트 데이터 사용
- 단일 `describe` 블록 내 순차 실행 (상태 공유)

**Complexity:** L

---

### US-002: 문서 카테고리 이동 API

**As a** 사용자,
**I want to** 문서를 다른 폴더(카테고리)로 이동하고 싶다,
**So that** 문서 구조를 재정리할 수 있다.

**Acceptance Criteria:**
- [ ] Given 문서가 카테고리 A에 있을 때, when `PATCH /documents/:id`에 `categoryId: B`를 전달하면, then 문서의 categoryId가 B로 변경됨
- [ ] Given 문서가 카테고리에 있을 때, when `categoryId: null`을 전달하면, then 문서가 루트로 이동됨
- [ ] Given 존재하지 않는 categoryId를 전달하면, then 404 반환
- [ ] Given viewer 권한 사용자가 이동을 시도하면, then 403 반환

**Technical Notes:**
- `apps/api/src/services/document-service.ts`의 `UpdateData` 인터페이스에 `categoryId?: string | null` 추가
- `apps/api/src/routes/documents.ts`의 PATCH Body 타입에 `categoryId` 추가
- `update()` 함수에서 `categoryId`가 undefined가 아닌 경우 업데이트에 포함
- categoryId가 제공된 경우 해당 카테고리가 같은 workspace에 존재하는지 검증 필요

**Complexity:** S

---

### US-003: 버전 API content 반환

**As a** 프론트엔드 개발자,
**I want to** 버전 API에서 각 버전의 content를 함께 반환받고 싶다,
**So that** 클라이언트에서 diff를 계산할 수 있다.

**Acceptance Criteria:**
- [ ] Given 문서에 3개 버전이 있을 때, when `GET /documents/:docId/versions`를 호출하면, then 각 버전에 `content` 필드가 포함됨
- [ ] Given 기존 version-history-modal.tsx의 `Version` 인터페이스와 동일한 형태로 반환

**Technical Notes:**
- `apps/api/src/services/document-service.ts`의 `getVersions()` select절에 `content: documentVersions.content` 추가
- content가 큰 경우 성능 우려 있으나, FIFO 20개 제한이므로 현재로서는 문제 없음
- 추후 대용량 문서인 경우 개별 버전 조회 API 분리 검토 가능

**Complexity:** S

---

### US-004: 버전 히스토리 diff UI 개선

**As a** 사용자,
**I want to** 버전 히스토리 모달에서 두 버전 간 차이를 시각적으로 확인하고 싶다,
**So that** 어떤 내용이 변경되었는지 한눈에 파악할 수 있다.

**Acceptance Criteria:**
- [ ] Given 버전을 선택했을 때, when diff가 렌더링되면, then 추가된 줄은 녹색(+), 삭제된 줄은 빨간색(-), 변경 없는 줄은 회색으로 표시
- [ ] Given 변경 없는 줄이 4줄 이상일 때, when diff가 렌더링되면, then 중간 줄은 접히고 "...N줄 동일..." 표시
- [ ] Given 현재 버전(idx===0)을 선택하면, when "이 버전으로 복원" 버튼 상태 확인, then disabled
- [ ] Given 미저장 변경이 있을 때, when 복원을 클릭하면, then 확인 다이얼로그 표시

**Technical Notes:**
- 현재 `version-history-modal.tsx`에 이미 `diffLines` 기반 diff 렌더링 구현 완료
- diff 라이브러리 `diff@^8.0.4`는 `apps/web/package.json`에 이미 설치됨
- 주요 개선 포인트: 버전 간 비교 모드 추가 (현재는 "선택 vs 현재"만 지원, 향후 "v3 vs v5" 같은 임의 비교 가능하도록)
- 라인 번호 표시 추가 고려

**Complexity:** M

---

### US-005: 프론트엔드 VersionHistoryModal 실제 테스트 구현

**As a** 개발자,
**I want to** version-history-modal.test.tsx의 스텁 테스트를 실제 구현으로 교체하고 싶다,
**So that** diff 렌더링과 복원 로직이 검증된다.

**Acceptance Criteria:**
- [ ] Given 버전 목록 mock 데이터가 주어졌을 때, when 모달을 렌더링하면, then 2-panel 레이아웃(좌: 버전 목록, 우: diff) 표시
- [ ] Given 버전 항목을 클릭했을 때, when diff 패널 확인, then 추가/삭제 줄이 올바른 색상으로 렌더링
- [ ] Given 현재 버전에 "현재" 뱃지가 표시됨
- [ ] Given 미저장 변경이 있을 때, when 복원 클릭, then window.confirm 호출 확인
- [ ] Given 복원 확인 시, when onRestore 콜백 호출 확인, then 선택된 버전의 content 전달

**Technical Notes:**
- `@testing-library/react` + `vitest` 사용
- `apiFetch` mock 필요 (MSW 또는 vi.mock)
- `useToastStore` mock 필요

**Complexity:** M

---

## 와이어프레임

버전 히스토리 diff UI는 현재 `version-history-modal.tsx`에 이미 구현되어 있어, 기존 UI 기반으로 개선사항 와이어프레임을 작성합니다.

---

## 구현 계획

### Phase 1: API 보완 (백엔드)

| 순서 | 태스크 | 파일 | 의존성 | 복잡도 |
|------|--------|------|--------|--------|
| 1-1 | 문서 PATCH에 categoryId 지원 추가 | `apps/api/src/services/document-service.ts` | 없음 | S |
| 1-2 | PATCH 라우트에 categoryId Body 파라미터 추가 | `apps/api/src/routes/documents.ts` | 1-1 | S |
| 1-3 | 버전 API에 content 필드 추가 | `apps/api/src/services/document-service.ts` (getVersions) | 없음 | S |

### Phase 2: 통합 테스트 (백엔드)

| 순서 | 태스크 | 파일 | 의존성 | 복잡도 |
|------|--------|------|--------|--------|
| 2-1 | KMS 전체 플로우 통합 테스트 작성 | `apps/api/tests/integration/kms-full-flow.test.ts` | 1-1, 1-2, 1-3 | L |

**2-1 테스트 시나리오 상세:**

```
describe('KMS Full-Flow Integration (agent workspace)')
  1. 사전 준비: 사용자 + "agent" 워크스페이스 생성
  2. 카테고리 CRUD:
     - 루트 카테고리 2개 생성 ("개발 가이드", "프로젝트 문서")
     - 자식 카테고리 1개 생성 ("개발 가이드/튜토리얼")
     - 카테고리 이름 변경
     - 카테고리 목록 조회 + 트리 조회
  3. 문서 CRUD (docs/sample/ 컨텐츠 활용):
     - TEST-Agent.md -> "개발 가이드" 카테고리
     - TEST-structure.md -> "개발 가이드/튜토리얼" 카테고리
     - TEST-Presentation.md -> "프로젝트 문서" 카테고리
     - SEO_RULE.md -> 루트 (카테고리 없음)
     - TEST-Contribute.md, TEST-command.md, TEST-sample.md, TEST-editor.md -> 나머지
     - 각 문서의 content 조회하여 일치 확인
  4. 태그 저장:
     - 문서 1에 태그 5개 설정 ["typescript", "react", "guide", "tutorial", "frontend"]
     - 워크스페이스 태그 목록 조회
  5. 카테고리 이동:
     - "개발 가이드"의 문서를 "프로젝트 문서"로 이동
     - categoryId 변경 확인
     - null로 변경하여 루트 이동 확인
  6. 문서 관계:
     - Doc A -> Doc B (next), Doc C (related) 설정
     - 양방향 확인 (B.prev == A)
     - 관계 조회
  7. 버전 기록:
     - 문서 content 3회 수정 -> v1~v4 확인
     - 버전 목록 조회 (content 포함 확인)
  8. 관계 수정 후 확인:
     - 문서 수정 후 관계 유지 확인
  9. 삭제 + 휴지통:
     - soft delete -> 목록에서 사라짐 확인
     - trash 목록에 표시 확인
     - restore -> 목록 복귀 확인
     - 재삭제 -> permanent delete -> DB 완전 삭제 확인
```

### Phase 3: 프론트엔드 diff 개선

| 순서 | 태스크 | 파일 | 의존성 | 복잡도 |
|------|--------|------|--------|--------|
| 3-1 | VersionHistoryModal 실제 테스트 구현 | `apps/web/__tests__/components/version-history-modal.test.tsx` | 1-3 | M |
| 3-2 | (선택) 버전 간 비교 모드 추가 | `apps/web/components/version-history-modal.tsx` | 1-3 | M |
| 3-3 | (선택) diff에 라인 번호 표시 | `apps/web/components/version-history-modal.tsx` | 3-2 | S |

---

## 영향받는 파일 목록

### 수정 필요 (백엔드)
| 파일 | 변경 내용 |
|------|-----------|
| `apps/api/src/services/document-service.ts` | UpdateData에 categoryId 추가, getVersions에 content 추가 |
| `apps/api/src/routes/documents.ts` | PATCH Body에 categoryId 추가 |

### 신규 생성
| 파일 | 설명 |
|------|------|
| `apps/api/tests/integration/kms-full-flow.test.ts` | KMS 전체 플로우 통합 테스트 |

### 수정 필요 (프론트엔드)
| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/__tests__/components/version-history-modal.test.tsx` | 스텁 -> 실제 테스트 구현 |
| `apps/web/components/version-history-modal.tsx` | (선택) 비교 모드 UI 개선 |

### 참조 (읽기 전용)
| 파일 | 이유 |
|------|------|
| `apps/api/tests/helpers/setup.ts` | 테스트 인프라 (getApp, getDb) |
| `apps/api/tests/helpers/factory.ts` | 테스트 팩토리 (createUser, createWorkspace) |
| `docs/sample/*.md` | 테스트 컨텐츠 소스 |
| `packages/db/src/schema/documents.ts` | 스키마 참조 |

---

## 발견된 이슈 및 리스크

### HIGH: 카테고리 이동 API 부재
- **현황**: `PATCH /documents/:id`의 `UpdateData`에 `categoryId`가 없음
- **영향**: 통합 테스트의 "카테고리 이동" 시나리오 구현 불가
- **해결**: Phase 1-1, 1-2에서 API 확장 필수

### HIGH: 버전 content 미반환
- **현황**: `getVersions()` 함수가 content를 select하지 않음
- **영향**: 프론트엔드 diff 계산이 실제로는 빈 값으로 동작 중 (또는 undefined)
- **해결**: Phase 1-3에서 content 필드 추가 필수

### MEDIUM: 문서 생성 API 응답 래핑 불일치
- **현황**: `POST /documents` 라우트가 `{ document: {...} }` 형태로 반환하지만, 기존 `documents.test.ts`는 `res.json()` 직접 사용 (래핑 없는 것처럼 접근)
- **영향**: 기존 테스트가 `document` 래핑을 무시하고 있을 수 있음. 신규 테스트에서는 라우트 코드 기준으로 `{ document: {...} }` 래핑 확인 필요
- **해결**: 신규 테스트에서는 `res.json().document` 접근. 기존 테스트는 별도 수정 이슈로 분리.

### LOW: 대용량 content의 버전 API 성능
- **현황**: 20개 버전의 content를 한번에 반환하면 payload가 클 수 있음
- **영향**: 현재 단계에서는 문제 없음 (FIFO 20개 제한)
- **해결**: 추후 필요시 GET /versions는 메타데이터만, GET /versions/:versionId는 content 포함으로 분리

---

## 오픈 질문

1. **카테고리 이동 시 슬러그 충돌**: 문서를 다른 카테고리로 이동할 때 slug 유니크 제약은 workspace 범위이므로 문제 없음. 확인 완료.
2. **버전 content 일괄 반환 vs 개별 조회**: 현재 Phase에서는 일괄 반환으로 충분한가? (답변: FIFO 20개 제한으로 충분)
3. **기존 테스트 응답 구조 불일치**: `documents.test.ts`의 `res.json() as { id, title, ... }` 접근이 실제 `{ document: { id, title, ... } }` 래핑과 맞지 않는 부분은 별도 이슈로 처리하는가?
