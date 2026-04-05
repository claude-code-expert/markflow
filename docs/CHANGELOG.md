# Docs Changelog

## v1.3.0 — 2026-04-04

> Phase 1 구현 완료 기준 전체 스펙 문서 동기화

### 변경 문서

| 문서 | 주요 변경 |
|------|----------|
| **001_requirement** | Phase 1 구현 완료 반영, 기능별 ✅/📋 상태 표시, 댓글·임베드·테마·프레젠테이션·가입요청·휴지통 기능 추가, OAuth Phase 3 이연 |
| **002_component** | 실제 38개 컴포넌트 전수 반영, Zustand 5개 스토어 문서화, use-permissions 훅(16개 권한) 추가, 기술 스택 버전 확정 |
| **003_user-flow** | 프레젠테이션·초대·가입요청·임베드·댓글 플로우 5건 추가, 전체 플로우 ✅/📋 상태 표시 |
| **004_data-model** | ID 타입 uuid→bigserial 전체 교체, workspaces slug 제거 + theme_preset/theme_css 추가, categories.order_index 추가, document_versions.author_id 추가, comments/embed_tokens 상세화, 16개 인덱스 전략 반영, OAUTH_ACCOUNTS Phase 3 이연 |
| **005_api-spec** | 엔드포인트별 구현 상태(✅/⏳/📋) 표시, `/links`→`/relations` 반영, `/categories/tree`·`/join-requests/batch` 추가, Theme·Embed Token·Graph API 섹션 추가, 미구현 엔드포인트 P1/P2/P3 요약 |
| **006_test-spec** | 통합 테스트 26개 파일 현황, 팩토리 함수 5종 문서화, 댓글·임베드·테마·그래프·프레젠테이션 시나리오 추가 |
| **007_architecture** | 기술 스택 확정(Fastify/Next.js 16/React 19/Zustand 5), 미들웨어 스택 5종, cleanup-trash 잡, 포트 배정(API:4000, Web:3002), API 구현 상태 테이블 |
| **008_roadmap** | Phase 1 ✅ 완료(2026-04-04), Phase 2 잔여 11개 항목 P1/P2 분류, Phase 3 OAuth 이연 명시 |
| **009_media-embed-spec** | 변경 없음 (v1.0 유지, Phase 2 예정) |

### 신규 문서

| 문서 | 내용 |
|------|------|
| **checklist-04-04.md** | 프로젝트 감사 체크리스트 — API/Frontend/DB/Editor 전체 현황 |
| **scenarios/test-scenarios-04-04.md** | 화면별 테스트 시나리오 183개 (19개 섹션) |

### ERD 업데이트

- 전체 ID 타입 uuid → bigserial 수정
- workspaces.slug 유령 컬럼 제거, theme_preset/theme_css 추가
- categories.order_index, document_versions.author_id 추가
- comments, embed_tokens 테이블 신규 추가 (13 → 15 테이블)
- 관계선 추가 (comments self-ref, embed_tokens FK)

### 삭제 파일 (v1_2 → v1_3 교체)

```
docs/001_requirement_v1_2.md
docs/002_component_v1_2.md
docs/003_user-flow_v1_2.md
docs/004_data-model_v1_2.md
docs/005_api-spec_v1_2.md
docs/006_test-spec_v1_2.md
docs/007_architecture.md          ← 버전 접미사 없던 구버전
```

### Ghost Fields 발견

| 필드 | 위치 | 상태 |
|------|------|------|
| `documents.start_mode` | 004/005 Spec | DB/API 미구현 — 구현 여부 결정 필요 |
| `OAUTH_ACCOUNTS` 테이블 | 004 Spec | Phase 3 이연 |

---

## v1.2.0 — 2026-03-26

- CATEGORY_CLOSURE 테이블 신규 (무제한 중첩 계층)
- DOCUMENTS에 start_mode 컬럼 추가 (기획)
- DOCUMENT_RELATIONS DAG 무결성 규칙 보강
- Categories API 상세화 (이동·Closure Table 동기화·에러 코드)
- 그래프 뷰 API 섹션 추가
- 폴더 관리 UI 컴포넌트 추가

## v1.1.0 — 2026-03-24

- WORKSPACE_JOIN_REQUESTS 테이블 추가
- ERD 관계 업데이트

## v1.0.0 — 2026-03-20

- 초기 스펙 문서 작성 (001-008)
- Phase 0 에디터 패키지 완성
