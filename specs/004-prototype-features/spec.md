# Feature Specification: Prototype-Based Feature Completion

**Feature Branch**: `004-prototype-features`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "프로토타입 기반 확장 기능 구현 - 핵심 기능(에디터/저장/스페이스) 유지, markflow-prototype.html 전체 요소 분석 후 미구현 기능 완성. docs/001~008 설계 문서와 크로스 체크"

## Clarifications

### Session 2026-03-27

- Q: 프로토타입의 DAG Visualization(메타 패널 미니 SVG + 전체 다이어그램 모달)이 스펙에 누락됨. 새 User Story로 추가할지? → A: 새 User Story로 추가 — 메타 패널 미니 DAG + 전체 다이어그램 모달 포함, 기존 그래프 컴포넌트 재활용
- Q: 프로토타입은 자동 저장+상태 표시(저장 중.../저장됨)를 보여주지만, 현재 코드는 수동 저장(Cmd+S)으로 전환됨. 어떻게 처리? → A: 현재 수동 저장 유지, 저장 상태 UI 추가 불필요
- Q: 프로토타입의 에디터 상태 표시(프리뷰 Word count + 에디터 커서 위치)를 포함할지? → A: 포함 — 별도 User Story 없이 기존 에디터 부가 요소로 추가

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Landing Page & Marketing Site (Priority: P1)

신규 방문자가 MarkFlow의 가치 제안을 이해하고 가입까지 자연스럽게 연결되는 랜딩 페이지를 경험한다. Hero 섹션, 핵심 기능 소개 6종, 가격 정책 3단계, 그리고 푸터를 포함한 전체 마케팅 페이지를 구성한다.

**Why this priority**: 제품의 첫인상이자 가입 전환의 시작점. 프로토타입에서 가장 완성도 높은 화면이며, 현재 코드베이스에 전혀 존재하지 않는 기능이다.

**Independent Test**: 랜딩 URL(/)에 접속하여 Hero, Features, Pricing, Footer가 모두 렌더링되고, "시작하기" 버튼이 회원가입 페이지로 이동하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 비로그인 사용자가 루트 URL에 접속, **When** 페이지 로드 완료, **Then** Hero(제목+CTA), Features(6개 카드), Pricing(Free/Team/Enterprise), Footer가 표시된다
2. **Given** 랜딩 페이지가 표시된 상태, **When** "Start for free" 버튼 클릭, **Then** 회원가입 페이지(/register)로 이동한다
3. **Given** 랜딩 페이지가 표시된 상태, **When** "View demo" 버튼 클릭, **Then** 워크스페이스 선택 페이지로 이동한다
4. **Given** 이미 로그인된 사용자가 루트 URL에 접속, **When** 페이지 로드, **Then** 워크스페이스 선택 페이지로 자동 리다이렉트된다

---

### User Story 2 - Global Search Modal (Priority: P2)

사용자가 키보드 단축키(Cmd+/ 또는 Ctrl+/)로 전역 검색 모달을 열어, 현재 워크스페이스의 문서를 제목과 내용으로 빠르게 검색하고 결과를 선택하여 해당 문서로 이동한다.

**Why this priority**: 프로토타입의 핵심 UX 요소 중 하나로, 사이드바 검색 바와 헤더 검색 아이콘 모두 이 모달을 호출한다. 문서 수가 많아질수록 필수적인 내비게이션 수단이다.

**Independent Test**: 앱 내 어디서든 Cmd+/를 누르면 검색 모달이 열리고, 검색어를 입력하면 일치하는 문서 목록이 표시되며, Enter로 선택한 문서 편집기가 열리는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 앱 내 아무 페이지, **When** Cmd+/ (또는 Ctrl+/) 누름, **Then** 중앙에 검색 모달이 열리고 입력 필드에 자동 포커스
2. **Given** 검색 모달이 열린 상태에서 텍스트 미입력, **When** 모달 표시, **Then** "최근 문서" 목록이 기본으로 표시
3. **Given** 검색 모달에 키워드 입력, **When** 검색어 타이핑, **Then** 제목과 내용에서 일치하는 문서 목록이 실시간 표시되며, 일치 부분이 하이라이트
4. **Given** 검색 결과 목록이 있는 상태, **When** 키보드 화살표로 탐색 후 Enter, **Then** 선택한 문서의 편집기 페이지로 이동
5. **Given** 검색 모달이 열린 상태, **When** Esc 또는 모달 외부 클릭, **Then** 모달이 닫힘

---

### User Story 3 - Workspace Join Request System (Priority: P3)

공개 워크스페이스에 참여하고 싶은 사용자가 가입 신청을 보내고, 워크스페이스 관리자가 해당 신청을 승인하거나 거절한다. 워크스페이스 선택 화면에서 공개 워크스페이스를 검색하고, 설정 > 멤버 관리에서 신청을 처리한다.

**Why this priority**: 프로토타입의 워크스페이스 선택 화면(Screen 4)에 가입 신청 패널이 명시적으로 포함되어 있고, 설계 문서(001 B2, 004, 005)에 전체 플로우가 정의되어 있다.

**Independent Test**: 워크스페이스 선택 화면에서 공개 워크스페이스를 검색하고 가입 신청을 보내면, 관리자의 멤버 관리 > 가입 신청 탭에 표시되어 승인/거절할 수 있는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 워크스페이스 선택 화면, **When** "공개 워크스페이스에 가입 신청" 패널을 열고 검색, **Then** 공개 워크스페이스 목록이 표시
2. **Given** 공개 워크스페이스 검색 결과, **When** "가입 신청" 버튼 클릭 후 메시지 작성, **Then** 신청이 전송되고 "승인 대기" 상태 표시
3. **Given** 관리자가 멤버 관리 페이지 접근, **When** "가입 신청" 탭 선택, **Then** 대기 중인 신청 목록이 표시(신청자 정보, 메시지, 신청일)
4. **Given** 가입 신청 목록, **When** 역할을 선택하고 "승인" 클릭, **Then** 신청자가 해당 역할로 멤버에 추가되고 알림
5. **Given** 가입 신청 목록, **When** "거절" 클릭, **Then** 신청이 거절 상태로 변경

---

### User Story 4 - Document Structure Diagram (Priority: P4)

문서 편집기의 메타 패널에서 현재 문서의 위치를 지식 그래프 내에서 시각적으로 파악할 수 있다. 메타 패널에 미니 DAG 다이어그램이 표시되고, 클릭하면 전체 다이어그램 모달이 열려 root → 카테고리 → 현재 문서 → 연결 문서들의 관계를 색상 코드로 구분하여 보여준다.

**Why this priority**: 프로토타입 메타 패널에 미니 SVG 다이어그램이, 전체 보기로 인터랙티브 모달(modal-doc-map)이 구현되어 있다. 설계 문서(001 B13/B14, 002)에 DAG Pipeline 시각화로 정의되어 있으며, 기존 dag-pipeline-graph 컴포넌트를 재활용할 수 있다.

**Independent Test**: 편집기 메타 패널에서 "문서 연결 구조" 섹션의 미니 다이어그램이 표시되고, 클릭 시 전체 모달이 열려 노드 클릭으로 문서 이동이 가능한지 확인한다.

**Acceptance Scenarios**:

1. **Given** 편집기에서 메타 패널이 열린 상태, **When** "문서 연결 구조" 섹션 확인, **Then** 미니 DAG SVG가 표시되어 root → 카테고리 → 현재 문서 → prev/next 관계를 시각화
2. **Given** 미니 DAG 다이어그램, **When** "전체 보기" 버튼 또는 다이어그램 클릭, **Then** 전체 다이어그램 모달이 열림
3. **Given** 전체 다이어그램 모달, **When** 모달 확인, **Then** 범례(현재 문서/카테고리/prev·next/연관/root 색상 구분), 줌 컨트롤(-/1:1/+), 요약 카드(카테고리 경로, prev/next, 연관 문서 수)가 표시
4. **Given** 전체 다이어그램의 노드, **When** 다른 문서 노드 클릭, **Then** 해당 문서의 편집기 페이지로 이동
5. **Given** 전체 다이어그램 모달, **When** "링크 편집" 버튼 클릭, **Then** 문서 링크 관리 모달(US8)이 열림

---

### User Story 5 - CSS Theme System (Priority: P5)

워크스페이스 관리자(Admin 이상)가 설정 > CSS 테마 페이지에서 5가지 프리셋 중 하나를 선택하거나, CSS 변수를 직접 편집하여 워크스페이스 전체 문서 프리뷰에 적용한다.

**Why this priority**: 프로토타입 설정 화면에 완전한 CSS 테마 에디터가 구현되어 있고, 설계 문서(001 B7, 005, 007)에 상세 스펙이 정의되어 있다. 워크스페이스 차별화의 핵심 기능이다.

**Independent Test**: 설정 > CSS 테마에서 프리셋을 변경하면 문서 프리뷰 스타일이 즉시 바뀌고, 커스텀 CSS 변수를 수정하여 저장하면 워크스페이스 내 모든 문서에 적용되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** Admin 사용자가 설정 > CSS 테마, **When** 프리셋(Default/GitHub/Notion/Dark/Academic) 중 하나 선택, **Then** 프리뷰가 해당 스타일로 즉시 변경
2. **Given** CSS 에디터가 표시된 상태, **When** CSS 변수(`--mf-*`)를 수정하고 "저장 & 적용" 클릭, **Then** 변경이 저장되고 워크스페이스 전체에 적용
3. **Given** CSS 에디터, **When** "검증" 버튼 클릭, **Then** CSS 문법 유효성이 검사되고 결과 표시
4. **Given** Editor/Viewer 권한 사용자, **When** CSS 테마 설정 페이지 접근 시도, **Then** 편집 불가(읽기 전용 또는 접근 차단)

---

### User Story 6 - Import/Export Enhancement (Priority: P6)

사용자가 Import/Export 모달을 통해 다양한 형식(MD, ZIP)으로 문서를 가져오거나 내보낸다. 가져오기 시 파일 형식 선택과 드래그앤드롭 업로드를, 내보내기 시 범위 선택(현재 문서/카테고리/전체)과 형식 선택을 지원한다.

**Why this priority**: 현재 API에 Import/Export 기능이 구현되어 있지만 프론트엔드 UI가 프로토타입 수준에 미달한다. 프로토타입의 모달 UI를 구현하여 사용성을 향상시킨다.

**Independent Test**: 사이드바 또는 툴바에서 Import/Export 모달을 열고, 파일 드래그앤드롭으로 가져오기 또는 형식/범위를 선택하여 내보내기가 동작하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 앱 내에서 Import/Export 모달 열림, **When** 가져오기 탭 선택, **Then** 파일 형식 선택(MD/ZIP)과 드래그앤드롭 영역이 표시
2. **Given** 가져오기 탭에서 MD 파일 선택, **When** 파일을 드롭존에 드래그, **Then** 파일이 업로드되고 현재 워크스페이스에 문서로 추가
3. **Given** 내보내기 탭 선택, **When** 형식(MD/ZIP)과 범위(현재 문서/카테고리/전체) 선택 후 실행, **Then** 해당 형식의 파일이 다운로드

---

### User Story 7 - Embed Integration Settings (Priority: P7)

워크스페이스 관리자가 설정 > 임베드 연동 페이지에서 3가지 임베드 방식(NPM 패키지, iframe + Guest Token, REST API)의 사용법을 확인하고, Guest Token을 발급/관리한다.

**Why this priority**: 프로토타입에 3개 탭으로 완전한 임베드 연동 UI가 구현되어 있다. 외부 프로젝트 통합은 MarkFlow의 핵심 차별점이다.

**Independent Test**: 설정 > 임베드 연동에서 각 탭(NPM/iframe/API)의 코드 예시가 표시되고, iframe 탭에서 Guest Token을 발급하면 토큰 목록에 추가되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** Admin이 설정 > 임베드 연동, **When** NPM 탭 선택, **Then** 설치 명령어와 React 사용 예시 코드가 표시
2. **Given** iframe 탭, **When** 토큰 라벨, 권한 범위, 만료일 입력 후 "토큰 발급" 클릭, **Then** 새 Guest Token이 생성되어 목록에 추가
3. **Given** 발급된 토큰 목록, **When** "복사" 클릭, **Then** 토큰이 클립보드에 복사
4. **Given** 발급된 토큰 목록, **When** "폐기" 클릭, **Then** 토큰이 무효화되고 목록에서 제거

---

### User Story 8 - Member Management Enhancement (Priority: P8)

워크스페이스 관리자가 멤버 관리 페이지에서 활성 멤버 목록, 가입 신청, 초대 현황, 멤버 데이터 내보내기를 탭으로 구분하여 관리한다.

**Why this priority**: 프로토타입에 4개 서브탭(멤버 목록/가입 신청/초대 현황/내보내기)이 구현되어 있으며, 현재 코드베이스에는 멤버 목록만 존재한다. 팀 관리의 완성도를 높인다.

**Independent Test**: 설정 > 멤버 관리에서 4개 탭 전환이 가능하고, 초대 현황 탭에서 발송된 초대의 만료 시간과 재발송이 동작하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 멤버 관리 페이지, **When** "초대 현황" 탭 클릭, **Then** 발송된 초대 목록(이메일, 역할, 발송 시간, 남은 유효시간)이 표시
2. **Given** 초대 현황 탭, **When** "재발송" 클릭, **Then** 해당 초대가 재발송되고 만료 시간 리셋
3. **Given** 멤버 관리 페이지, **When** "내보내기" 탭 클릭, **Then** CSV/PDF 내보내기 옵션이 표시
4. **Given** 멤버 목록 탭, **When** 역할 권한 매트릭스 표 확인, **Then** Owner/Admin/Editor/Viewer 각 역할의 권한이 표 형태로 표시

---

### User Story 9 - Document Links Modal & Preview Navigation (Priority: P9)

문서 작성자가 편집기 메타 패널에서 문서 링크 관리 모달을 열어 이전/다음/연관 문서를 설정하고, 프리뷰 하단에 이전/다음 문서 내비게이션이 표시된다.

**Why this priority**: 프로토타입에 문서 링크 관리 모달과 프리뷰 하단 Prev/Next 내비게이션이 명시되어 있다. 현재 문서 관계(relations) API는 구현되어 있으나, 전용 편집 모달이 없다.

**Independent Test**: 메타 패널 > 문서 링크 > "관리" 버튼 클릭 시 모달이 열리고, Prev/Next/Related 문서를 설정하면 프리뷰 하단에 내비게이션이 표시되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 편집기에서 메타 패널이 열린 상태, **When** 문서 링크 섹션의 "관리" 클릭, **Then** 문서 링크 관리 모달 표시(이전/다음/연관 입력 필드)
2. **Given** 문서 링크 모달, **When** 이전 문서를 검색하여 선택, **Then** 순환 참조 자동 감지가 동작하고 링크가 설정
3. **Given** 문서에 이전/다음 링크가 설정된 상태, **When** 프리뷰 하단 확인, **Then** "← 이전 문서" / "다음 문서 →" 내비게이션 카드가 표시
4. **Given** 프리뷰의 Prev/Next 카드, **When** 클릭, **Then** 해당 문서의 편집기 페이지로 이동

---

### User Story 10 - Toast Notification System (Priority: P10)

시스템 전반에서 사용자 액션(저장, 삭제, 초대, 오류 등)에 대한 피드백을 화면 우측 하단 토스트 알림으로 표시한다.

**Why this priority**: 프로토타입의 거의 모든 인터랙션에 토스트 알림이 사용된다. 현재 코드베이스에 통합된 토스트 시스템이 없어 사용자 피드백이 부족하다.

**Independent Test**: 문서 저장, 초대 발송, 설정 변경 등 주요 액션 후 화면 우측 하단에 성공/오류 토스트가 표시되고 일정 시간 후 자동으로 사라지는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 사용자가 성공적인 액션 수행(예: 저장), **When** 액션 완료, **Then** 초록색 성공 토스트가 우측 하단에 표시되고 3초 후 자동 닫힘
2. **Given** 액션 실패(예: 네트워크 오류), **When** 오류 발생, **Then** 빨간색 오류 토스트가 표시되고 5초 후 자동 닫힘
3. **Given** 여러 토스트가 연속 발생, **When** 토스트가 쌓임, **Then** 최대 3개까지 스택으로 표시되고 오래된 것부터 제거

---

### User Story 11 - Version History Enhancement (Priority: P11)

문서 편집기 메타 패널 또는 전용 모달에서 문서의 버전 히스토리를 조회하고, 특정 버전의 변경 내용을 diff 형태로 미리보기하며, 원하는 버전으로 복원한다.

**Why this priority**: 프로토타입에 버전 히스토리 모달이 좌측 버전 목록 + 우측 diff 미리보기 레이아웃으로 상세하게 구현되어 있다. 현재 version-history-panel은 기본적인 목록만 제공한다.

**Independent Test**: 메타 패널의 "전체 보기" 버튼으로 버전 히스토리 모달을 열고, 버전을 선택하면 diff 미리보기가 표시되며, "복원" 버튼으로 해당 버전의 내용이 에디터에 적용되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 편집기에서 메타 패널의 버전 히스토리 섹션, **When** "전체 보기" 클릭, **Then** 2패널 레이아웃(좌: 버전 목록, 우: diff 미리보기) 모달 표시
2. **Given** 버전 히스토리 모달, **When** 좌측 목록에서 이전 버전 선택, **Then** 우측에 현재 버전 대비 변경 사항이 추가(초록)/삭제(빨강) diff로 표시
3. **Given** diff 미리보기가 표시된 상태, **When** "이 버전으로 복원" 클릭, **Then** 에디터 내용이 선택한 버전으로 교체되고 새 버전이 생성

---

### Edge Cases

- 검색 모달에서 검색 결과가 0건일 때 빈 상태 안내 메시지가 표시되는가?
- 가입 신청을 이미 보낸 워크스페이스에 중복 신청을 시도하면 어떻게 처리하는가?
- CSS 테마 편집기에 잘못된 CSS를 입력했을 때 검증 오류가 사용자에게 명확히 전달되는가?
- Guest Token이 만료된 후 iframe으로 접근 시 적절한 오류 메시지가 표시되는가?
- Import 시 동일한 제목의 문서가 이미 존재할 때 충돌 해결 전략(덮어쓰기/건너뛰기/이름변경)이 제공되는가?
- 버전 복원 시 현재 저장되지 않은 변경 사항이 있으면 경고가 표시되는가?
- 토스트가 쌓였을 때 스크롤 영역을 가리지 않도록 위치가 관리되는가?
- 문서 링크에서 순환 참조(A→B→C→A)를 3단계 이상 깊이에서도 정확히 감지하는가?
- DAG 다이어그램에서 연결 문서가 없는 고립된 문서일 때 어떻게 표시되는가?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a landing page with Hero, Features (6 cards), Pricing (3 tiers: Free/Team/Enterprise), and Footer sections
- **FR-002**: System MUST redirect authenticated users from the landing page to the workspace selector
- **FR-003**: System MUST provide a global search modal triggered by Cmd+/ (Mac) or Ctrl+/ (Windows/Linux)
- **FR-004**: System MUST display recent documents by default when the search modal opens without input
- **FR-005**: System MUST highlight matching text in search results
- **FR-006**: System MUST support keyboard navigation (arrow keys + Enter) in search results
- **FR-007**: System MUST allow users to submit join requests to public workspaces with an optional message
- **FR-008**: System MUST prevent duplicate join requests from the same user to the same workspace
- **FR-009**: System MUST allow Admin+ users to approve or reject join requests, specifying the role on approval
- **FR-010**: System MUST display a mini DAG diagram in the editor meta panel showing the current document's position (root → category → current → prev/next/related)
- **FR-011**: System MUST provide a full-screen DAG diagram modal with color-coded nodes (current=blue, category=light blue, prev/next=green, related=purple, root=gray), a legend, and zoom controls
- **FR-012**: System MUST support interactive node clicks in the DAG modal to navigate to the clicked document
- **FR-013**: System MUST display summary cards in the DAG modal showing category path, prev/next documents, and related document count
- **FR-014**: System MUST connect the DAG modal to the document links editing modal via a "링크 편집" button
- **FR-015**: System MUST provide 5 CSS theme presets (Default, GitHub, Notion, Dark, Academic) selectable by Admin+
- **FR-016**: System MUST provide a CSS variable editor restricted to `--mf-*` prefix variables in Phase 1
- **FR-017**: System MUST validate CSS syntax before applying theme changes
- **FR-018**: System MUST persist workspace CSS themes and apply them to all document previews within the workspace
- **FR-019**: System MUST display a full Import/Export modal with file type selection and drag-and-drop upload
- **FR-020**: System MUST support import conflict resolution (overwrite, skip, rename) when duplicate document titles exist
- **FR-021**: System MUST support export scope selection (current document, current category, entire workspace)
- **FR-022**: System MUST display embed integration documentation in 3 tabs (NPM, iframe, REST API) with code examples
- **FR-023**: System MUST support Guest Token CRUD (create with label/scope/expiry, list, copy, revoke) for iframe embedding
- **FR-024**: System MUST display member management with 4 sub-tabs (active members, join requests, invite status, data export)
- **FR-025**: System MUST show invitation status with remaining validity time and support re-sending
- **FR-026**: System MUST display a role permission matrix (Owner/Admin/Editor/Viewer x Read/Write/Invite/Settings)
- **FR-027**: System MUST provide a document links management modal for setting Prev/Next/Related documents
- **FR-028**: System MUST detect circular references when setting Prev/Next links
- **FR-029**: System MUST display Prev/Next document navigation cards at the bottom of the preview pane
- **FR-030**: System MUST provide toast notifications for success (green, auto-close 3s) and error (red, auto-close 5s) states
- **FR-031**: System MUST stack multiple toasts (max 3 visible) at the bottom-right corner
- **FR-032**: System MUST display a version history modal with side-by-side layout (version list + diff preview)
- **FR-033**: System MUST show additions (green) and deletions (red) in version diff preview
- **FR-034**: System MUST warn users before version restoration if unsaved changes exist
- **FR-035**: System MUST display a word count in the preview pane header
- **FR-036**: System MUST display cursor position (line number, column number) in the editor pane header

### Key Entities

- **Join Request**: Represents a user's request to join a public workspace. Key attributes: requester, target workspace, optional message, status (pending/approved/rejected), assigned role on approval, request date
- **Guest Token**: Represents an authentication token for iframe embedding. Key attributes: label, scope (read/read-write), allowed document IDs, expiration date, creation date, creator
- **CSS Theme**: Represents a workspace-level CSS customization. Key attributes: workspace, preset name, custom CSS content, applied date
- **Version Diff**: Represents the difference between two document versions. Key attributes: source version, target version, additions, deletions, changed line count
- **DAG Context**: Represents the graph context of a document within the workspace knowledge structure. Key attributes: current document, parent category chain, prev/next documents, related documents, node types and positions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users visiting the landing page can understand the product's value proposition and reach the signup page within 2 clicks
- **SC-002**: Users can find and open any document in the workspace within 5 seconds using the global search modal
- **SC-003**: Workspace join request submissions complete within 3 seconds, and administrators can process requests from a single management page
- **SC-004**: Users can visually identify their document's position in the knowledge graph within 2 seconds by viewing the meta panel DAG diagram
- **SC-005**: Workspace administrators can switch between 5 theme presets and see the result applied within 2 seconds
- **SC-006**: 100% of user actions that modify data provide immediate visual feedback via toast notifications
- **SC-007**: Users can import a single markdown file through drag-and-drop in under 10 seconds
- **SC-008**: Users can compare any two document versions and see a clear visual diff within 3 seconds
- **SC-009**: Document navigation via Prev/Next links allows users to traverse related documents without returning to the document list
- **SC-010**: All 11 user stories function independently and can be deployed and tested in isolation

## Assumptions

- The existing authentication system (JWT + refresh token) is reused for all new features
- The existing API endpoints for documents, workspaces, members, categories, tags, versions, relations, and import/export are stable and functional
- Landing page is server-rendered (SSR) for SEO benefits
- CSS Theme Phase 1 restricts editing to CSS variable overrides only (`--mf-*` prefix); full CSS editing is deferred to Phase 2
- Guest Token and embed functionality focuses on the frontend management UI; the actual iframe rendering page is deferred
- Real-time collaboration indicators (collab avatars) shown in the prototype are deferred to Phase 2 (requires Yjs infrastructure)
- HTML/PDF import and export formats shown in the prototype are deferred (tagged as P1/P2 in the prototype itself)
- Toast notification uses client-side only; no server-push mechanism needed
- Version diff uses a line-by-line comparison approach suitable for markdown text
- Public workspace search and join request flow requires a new API endpoint for listing public workspaces
- The existing dag-pipeline-graph component and graph page will be reused and adapted for the meta panel mini DAG and full diagram modal
- The prototype's auto-save behavior and save status indicator (saving/saved) are intentionally excluded; the current manual save (Cmd+S) is retained as-is
