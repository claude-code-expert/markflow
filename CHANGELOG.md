# Changelog

## [0.2.0] - 2026-04-03

### API 보완

- **fix: 문서 태그 GET 엔드포인트 추가** — `GET /workspaces/:wsId/documents/:docId/tags` 누락으로 태그가 로드되지 않던 문제 해결
- **feat: 문서 카테고리 이동 API** — `PATCH /documents/:id` Body에 `categoryId` 필드 추가, 문서를 다른 폴더로 이동 가능
- **fix: 버전 히스토리 content 반환** — `getVersions()`가 `content`를 포함하도록 수정, diff 기능 활성화
- **fix: 로그인 에러 코드 정규화** — `UNAUTHORIZED` → `INVALID_CREDENTIALS` / `EMAIL_NOT_VERIFIED` / `ACCOUNT_LOCKED`로 세분화, 프론트엔드 에러 메시지 매칭

### 프론트엔드 버그 수정

- **fix: NewFolderModal/FolderContextMenu slug→ID** — workspace slug 대신 UUID를 API 경로에 사용하도록 수정 (RBAC 403 해결)
- **fix: TagInput queryKey/deps 불일치** — `wsKey`로 통일, useCallback 의존성 배열 수정
- **fix: SearchModal useRef 초기값** — React 19 호환을 위해 `useRef<T>(undefined)` 초기값 추가
- **fix: DocumentLinksModal relations 400 오류** — `prev`/`next`가 null일 때 `undefined`로 전달하여 JSON에서 제외

### UI 개선

- **feat: 문서 에디터 헤더 재구성** — 버전 기록(History), 문서 속성(PanelRight) 아이콘을 제목 줄 우측에 배치
- **feat: 에디터 컨트롤 메타 줄 이동** — 테마 토글, 레이아웃 스위처(에디터/분할/미리보기)를 메타 줄 우측으로 이동, 에디터 내부 `.mf-toolbar-spacer` 숨김
- **feat: 인라인 카테고리 선택** — 제목 인풋 좌측에 FolderOpen + select 드롭다운, 새 문서 모달 제거 후 바로 에디터로 이동
- **feat: 헤더 공통 새 문서 아이콘** — AppHeader에 FilePlus 아이콘 추가, 클릭 시 즉시 문서 생성 + 네비게이션
- **feat: 이전/다음 문서 UI 개선** — 좌/우 정렬, 높이 36px, 최대 너비 200px, 호버 툴팁
- **feat: 모든 모달 배경색/블러 제거** — 5개 모달에서 `bg-black/35`, `backdrop-blur-sm` 제거
- **feat: 공통 토스트 알림** — 문서 저장, 카테고리 변경, 태그 저장 시 성공/실패 토스트 표시
- **feat: 사이드바 폴더 섹션** — "문서" → "폴더"로 변경, + 아이콘 ↔ ChevronDown 토글
- **feat: 문서 목록 리스트형 기본** — 기본 뷰 모드 list, 페이지당 10개 기본, 10/20/50 선택, 하단 "더보기" 버튼
- **feat: 태그 입력 포커스 유지** — 엔터로 태그 추가 후 입력 필드에 포커스 복원

### 프리젠테이션 모드

- **feat: 프리젠테이션 모드 구현** — `/present/[slug]/[docId]` 별도 라우트, 새 창으로 열림
- Fullscreen API로 브라우저 전체화면 (주소창/탭/즐겨찾기 숨김)
- 폰트 크기 3단계 (기본 16px / 중간 20px / 크게 24px), 너비 비례 확장
- 하단 독 바: 마우스 하단 이동 시 표시, 화면 클릭 시 닫힘
- 펜 모드: Canvas 드로잉, 색상 6종, 굵기 4단계
- 우측 목차 패널: H1/H2 추출, 클릭 시 앵커 스크롤 이동
- ESC 1회 전체화면 해제, 2회 창 닫기

### 테스트

- **test: KMS 전체 플로우 통합 테스트** — 9개 Phase (폴더 CRUD, 문서 CRUD, 태그 5개, 카테고리 이동, 문서 관계, 버전 히스토리, 그래프, 삭제/복원, 카테고리 제약) 통과
