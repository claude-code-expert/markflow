# Docs Changelog

## v1.5.0 — 2026-04-06

> 마인드맵 그래프 전면 재작성, 문서 프리뷰 모달, 문서 삭제 기능

### 마인드맵 그래프 (전면 재작성)

| 변경 | 설명 |
|------|------|
| **Canvas 렌더러 재작성** | HTML 프로토타입(`graph-mindmap-v2.html`) 기반 전면 이식 — 다크/라이트 테마, 파티클 시스템, 보간 애니메이션 포함 |
| **다크/라이트 테마** | 상단 바 토글로 전환, 브랜치 색상·배경·glow 효과 테마별 분리 |
| **파티클 시스템** | prev/next/related 연결선 위 빛점 흐름 — 문서 읽기 방향 시각화 |
| **전환 보간** | 노드 전환 시 이전→새 좌표 lerp + easeOutCubic 애니메이션 |
| **인터랙션 변경** | 클릭 → 노드 이동, 우클릭 → 문서 프리뷰 모달, 더블클릭 → 패닝 초기화 |
| **자동 선택** | 연결이 가장 많은 문서가 초기 중심 노드로 자동 선택 |
| **워크스페이스 초기화** | `fetchWorkspaces` + `setCurrentWorkspace` 추가 (이전에 누락) |

### 문서 편집기

| 변경 | 설명 |
|------|------|
| **문서 삭제 버튼** | 저장 버튼 오른쪽에 `Trash2` 아이콘 삭제 버튼 추가 (hover 시 빨간색) |
| **공통 ConfirmModal** | 재사용 가능한 확인 모달 컴포넌트 (`confirm-modal.tsx`) — danger variant 지원 |
| **GraphPreviewModal** | 그래프에서 우클릭 시 문서 마크다운 미리보기 오버레이 |

### DB 마이그레이션

| 변경 | 설명 |
|------|------|
| `0001_parched_robin_chapel.sql` 적용 | `documents.slug` 컬럼 DROP — 문서 생성 500 에러 해결 |

---

## v1.4.0 — 2026-04-06

> 에디터 HTML 패스스루, 마인드맵 그래프, 사이드바 드래그앤드롭, UI 통일 및 다수 버그 수정

### 에디터 (packages/editor)

| 변경 | 설명 |
|------|------|
| **HTML 패스스루** | `rehype-raw` 추가 — 마크다운 내 `<details>`, `<kbd>`, `<mark>`, `<table>`, `<figure>` 등 GitHub 스타일 HTML 렌더링 지원 |
| sanitize 스키마 확장 | `details`, `summary`, `kbd`, `mark`, `sup`, `sub`, `abbr`, `ins`, `del`, `figure`, `dl` 등 22개 태그/속성 허용 (XSS 방어 유지) |
| 프리뷰 CSS | 새 HTML 요소 스타일 추가 (`.mf-preview details`, `kbd`, `mark` 등) |
| 다크 모드 | `--mf-color-mark-bg`, `--mf-color-mark-text` 변수 추가 |

### 마인드맵 그래프 (신규)

| 변경 | 설명 |
|------|------|
| **`MindMapCanvas` 컴포넌트** | Canvas 2D 기반 5-브랜치 방사형 마인드맵 (카테고리 / 이전 / 다음 / 연관 / 태그) |
| **`/graph` 페이지** | 워크스페이스 전체 문서 그래프 시각화, 이전/다음 내비게이션, 우측 독 문서 목록, 카테고리 필터 |
| 인터랙션 | 노드 클릭 선택, 드래그 패닝, 더블클릭 리셋, easeOut 전환 애니메이션 |
| 기존 그래프 삭제 | `dag-pipeline-graph.tsx`, `dag-pipeline-nav.tsx`, 기존 `graph/page.tsx` 제거 |

### 사이드바 & 트리

| 변경 | 설명 |
|------|------|
| **문서 드래그앤드롭** | 문서를 폴더로 드래그하면 `categoryId` 변경, "전체 문서"에 드롭하면 미분류 이동 |
| 들여쓰기 정렬 | `DOC_SPACER_PX` 도입 — 문서 아이콘이 폴더 아이콘과 수직 정렬 |
| 좌측 여백 축소 | `BASE_PL` 10→4, `INDENT_PX` 16→12, `GripVertical` 핸들 제거 |
| root 문서 정렬 | 미분류 문서가 폴더와 동일한 깊이로 정렬 |

### UI 통일 & 개선

| 변경 | 설명 |
|------|------|
| **전역 select 스타일** | `globals.css`에 통일된 `select` 스타일 — 8개 파일 인라인 스타일 제거 |
| 로고 아이콘 | `#` 아이콘 SVG를 블루박스에 꽉 차도록 확대 |
| 워크스페이스 목록 | 폴더/문서 수 카운트 표시 (`FolderOpen`, `FileText` 아이콘) |
| 저장소 배너 닫기 | X 아이콘 + 24시간 localStorage 기반 dismiss |
| DAG 모달 동적 크기 | SVG viewBox 높이를 연결 문서 수에 따라 동적 계산 — 잘림 방지 |
| DAG 모달 패닝 | viewBox 기반 드래그 패닝 + 줌 |
| DAG Summary → Nav bar | 3분할 내비게이션 바 (← 이전 / 연관 드롭다운 / 다음 →), 카테고리 뱃지를 헤더로 이동 |
| 문서 링크 모달 키보드 | 검색 드롭다운에 ↑↓ 방향키 + Enter 선택 지원, `SearchDropdown` 컴포넌트 추출 |
| 태그 제한 | 문서당 최대 태그 30→5개로 변경 |

### 버그 수정

| 버그 | 원인 | 수정 |
|------|------|------|
| ZIP 내보내기 빈 파일 (22B) | `category_closure` 테이블에 self-reference 누락 → descendants 0개 | closure 의존 제거, `parentId` BFS 순회로 변경 + `PassThrough` pipe |
| DAG root 문서 연결 끊김 | `categoryPath`에 카테고리 ID(숫자) 전달 → 이름 대신 숫자 표시 | `categoryList.find()`로 실제 이름 조회, 타입 `number → string` 변경 |
| DAG 모달 root→현재 선 끊김 | 카테고리 없을 때 선이 x=218까지만 그려짐 (현재 문서는 x=404) | 카테고리 유무에 따라 연결선 분기 |
| 문서 링크 저장 400 에러 | `prev`/`next`를 number로 전송 (API는 string 기대) | `String(id)`로 변환 |
| workspace count 전체 DB 스캔 | `inArray(wsIds)` 필터 누락 | 필터 추가 + `Promise.all` 병렬화 |

### 코드 품질

| 변경 | 설명 |
|------|------|
| .bak 파일 43개 삭제 | 전체 데드코드 제거, `.gitignore`에 `*.bak` 추가 |
| `DOC_SPACER_PX` 중복 제거 | `category-tree.tsx`에서 export → `sidebar.tsx`에서 import |
| localStorage 키 네이밍 | `storageBannerDismissedAt` → `mf-storage-banner-dismissed-at` |
| dragOver 핫패스 | 이미 true인 경우 `setDocDragOver` 스킵 |
| handleMoveDoc 에러 처리 | 실패 시 토스트 표시 (기존: 무시) |
| export BFS 최적화 | O(N×M) → O(N) `childrenMap` 사전 구축 |

---

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
