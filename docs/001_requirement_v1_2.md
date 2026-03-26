# 001 — 기능 요구사항 (Functional Requirements)

> **버전:** 1.2.0
> **최종 수정:** 2026-03-26
> **상태 범례:** ✅ 구현 완료 · 🚧 진행 중 · 📋 계획됨
> **변경 이력:**
> - v1.2.0 — B4 폴더 관리 UI 🚧(컨텍스트 메뉴·생성 모달 프로토타입 구현), B5 문서 링크 내비게이션을 DAG Pipeline 방식으로 전환, B13 시각화 방식 SVG force-directed → DAG Pipeline Stage Graph로 변경, B14 그래프 뷰 전체 페이지 신규 추가
> - v1.1.0 — B2 멤버 관리 확장(가입 신청·내보내기), B11a 워크스페이스 리스트뷰, B13 문서 구조 다이어그램 추가

---

## 1. 제품 구성

MarkFlow는 두 개의 레이어로 구성된다:

| 레이어 | 패키지 | 설명 | 상태 |
|--------|--------|------|------|
| **Editor** | `@markflow/editor` | 독립 Markdown 에디터 컴포넌트 | ✅ 구현 완료 |
| **KMS** | `apps/` | 팀 지식 관리 SaaS (인증, 워크스페이스, 협업 등) | 📋 계획됨 |

---

## Part A. Markdown 에디터 (`@markflow/editor`)

### A1. Dual View 편집 `P0` ✅

| 항목 | 내용 |
|------|------|
| **설명** | 좌측 Source 편집 + 우측 실시간 Preview |
| **에디터 엔진** | CodeMirror 6 |
| **파서** | unified / remark-parse / remark-gfm / remark-rehype / rehype-stringify |
| **레이아웃** | Split(기본) / Editor Only / Preview Only 전환 |

**인수 조건**
- [x] 편집 내용이 미리보기에 즉시 반영
- [x] 편집창 ↔ 미리보기 스크롤 동기화 (비율 기반)
- [x] 레이아웃 3종 전환 (split / editor / preview)
- [x] 상태바에 줄 수, 문자 수 표시
- [x] 라이트/다크 테마 전환

---

### A2. 지원 Markdown 구문 `P0` ✅

#### 블록 요소 (CommonMark 0.28)

| 구문 | 예시 | 상태 |
|------|------|------|
| ATX Heading (H1-H6) | `# ~ ######` | ✅ |
| Setext Heading | `===`, `---` 밑줄 | ✅ (파싱) |
| Thematic Break | `---`, `***` | ✅ |
| Fenced Code Block | ` ```lang ``` ` | ✅ (구문 강조 포함) |
| Indented Code Block | 4-space indent | ✅ (파싱) |
| Block Quote | `> text` | ✅ |
| Unordered List | `- item`, `* item` | ✅ |
| Ordered List | `1. item` | ✅ |
| Task List (GFM) | `- [ ] task` | ✅ |
| Table (GFM) | `| col | col |` | ✅ |
| HTML Block | Raw HTML | 📋 P1 |
| Footnote | `[^1]: text` | 📋 P1 |

#### 인라인 요소

| 구문 | 예시 | 상태 |
|------|------|------|
| Bold | `**text**` | ✅ |
| Italic | `*text*` | ✅ |
| Bold+Italic | `***text***` | ✅ |
| Strikethrough (GFM) | `~~text~~` | ✅ |
| Inline Code | `` `code` `` | ✅ |
| Link | `[text](url)` | ✅ |
| Image | `![alt](url)` | ✅ |
| Autolink | `<https://example.com>` | ✅ |
| Hard Line Break | 줄 끝 `\` 또는 2 spaces | ✅ |
| Inline Math (KaTeX) | `$formula$` | ✅ |
| Block Math (KaTeX) | `$$formula$$` | ✅ |
| Mermaid Diagram | ` ```mermaid ``` ` | 📋 P1 |

---

### A3. 툴바 `P0` ✅

**렌더링 그룹 (순서대로)**

| 그룹 | 버튼 |
|------|------|
| Heading | H1, H2, H3, H4, H5, H6 |
| Format | Bold, Italic, Strikethrough, Inline Code |
| List | Bullet List, Ordered List, Task List |
| Block | Blockquote, Code Block, HR |
| Insert | Link, Image, Table |
| Math | Math Inline, Math Block |
| Media | Image Upload (Cloudflare R2) |
| View | Theme Toggle, Editor Only, Split, Preview Only, Settings |
| Meta | Meta Panel Toggle, Export |

**인수 조건**
- [x] 툴바 버튼 클릭 시 선택 텍스트를 감싸거나 커서 위치에 삽입
- [x] 선택 텍스트 없을 시 플레이스홀더 텍스트 삽입 후 선택 상태
- [x] 아이콘에 마우스 오버 시 단축키 포함 툴팁 표시

---

### A4. 툴바 액션 상세 정의

> 스펙 기반: CommonMark 0.28 + GFM

각 액션의 `InsertSyntax` 정의:

| 기능 | type | prefix | suffix | defaultContent |
|------|------|--------|--------|----------------|
| H1~H6 | `heading` | `# `~`###### ` | — | — |
| Bold | `bold` | `**` | `**` | `bold text` |
| Italic | `italic` | `*` | `*` | `italic text` |
| Strikethrough | `strikethrough` | `~~` | `~~` | `strikethrough` |
| Blockquote | `blockquote` | `> ` | — | — |
| Unordered List | `ul` | `- ` | — | — |
| Ordered List | `ol` | `1. ` | — | — |
| Task List | `task` | `- [ ] ` | — | — |
| Inline Code | `code` | `` ` `` | `` ` `` | `code` |
| Code Block | `codeblock` | ` ``` ` | ` ``` ` | — |
| Link | `link` | `[` | `](url)` | `link text` |
| Image | `image` | `![` | `](url)` | `alt text` |
| Table | `table` | (template) | — | 3-column template |
| HR | `hr` | `---` | — | — |
| Math Inline | `math-inline` | `$` | `$` | `E=mc^2` |
| Math Block | `math-block` | `$$` | `$$` | `formula` |

---

### A5. 단축키 `P0` ✅

| 단축키 | 기능 |
|--------|------|
| `Ctrl+B` | 굵게 |
| `Ctrl+I` | 기울임 |
| `Ctrl+K` | 링크 삽입 |
| `Ctrl+`` ` `` | 인라인 코드 |
| `Ctrl+Shift+K` | 코드 블록 |
| `Ctrl+Alt+1~6` | H1~H6 제목 |
| `Ctrl+Z` / `Ctrl+Y` | 실행 취소 / 다시 실행 |
| `Tab` / `Shift+Tab` | 들여쓰기 / 내어쓰기 |
| `Ctrl+/` | 전역 검색 모달 열기 |

---

### A6. 이미지 업로드 `P0` ✅

| 항목 | 내용 |
|------|------|
| **방식** | Cloudflare R2 Workers 기반 업로드 |
| **트리거** | 툴바 버튼 / 드래그-드롭 / 클립보드 붙여넣기 |
| **설정** | Settings 모달에서 Worker URL 입력 |
| **확장** | `onImageUpload` prop으로 커스텀 업로더 주입 가능 |

**인수 조건**
- [x] Worker URL 미설정 시 Settings 모달 자동 오픈
- [x] 업로드 중 `![Uploading filename...]()`  플레이스홀더 표시
- [x] 업로드 완료 시 실제 URL로 교체
- [x] 업로드 실패 시 에러 메시지 표시

---

### A7. 렌더링 파이프라인 ✅

```
markdown (string)
  → remark-parse          (CommonMark AST)
  → remark-gfm            (Tables, TaskList, Strikethrough)
  → remark-math           ($...$ / $$...$$)
  → remark-rehype         (HAST)
  → rehype-highlight      (코드 구문 강조)
  → rehype-katex          (수식 렌더링)
  → rehype-sanitize       (XSS 방어)
  → rehype-stringify       (HTML string)
  → dangerouslySetInnerHTML
```

---

### A8. 비기능 요구사항

| 항목 | 목표 | 상태 |
|------|------|------|
| 에디터 입력 지연 | < 16ms (60fps) | ✅ |
| Controlled / Uncontrolled 모드 | 둘 다 지원 | ✅ |
| React 호환성 | React 18 + 19 | ✅ |
| 빌드 출력 | ESM + CJS + CSS | ✅ |
| XSS 방어 | rehype-sanitize | ✅ |
| 스타일 격리 | `.mf-` prefix 네임스페이스 | ✅ |
| 테마 커스터마이징 | CSS 변수 (`themeVars` prop) | ✅ |

---

## Part B. KMS SaaS (📋 계획됨)

> 아래 기능은 에디터 패키지 위에 구축될 SaaS 기능이며, 아직 구현되지 않음.

### B1. 인증 & 계정 관리

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 이메일/비밀번호 회원가입 | P0 | bcrypt 해시, 이메일 인증 링크 (24시간) |
| 이메일/비밀번호 로그인 | P0 | JWT Access Token(15분) + Refresh Token(7일, HttpOnly Cookie) |
| 소셜 로그인 (Google, GitHub) | P1 | OAuth 콜백, 계정 연결/해제 |
| 프로필 편집 | P0 | 이름, 아바타(JPG/PNG, 2MB), 비밀번호 변경 |
| 로그아웃 | P0 | Refresh Token 즉시 무효화, 전체 기기 로그아웃 |

**주요 인수 조건**
- [ ] 비밀번호: 8자 이상, 영문+숫자+특수문자
- [ ] 동일 계정 5회 연속 로그인 실패 시 15분 **계정 잠금** → `401 + { code: "ACCOUNT_LOCKED" }` 반환
- [ ] IP 기준 10회/15분 초과 시 **Rate Limit** → `429 + { code: "RATE_LIMITED" }` 반환 (계정 잠금과 별개 동작)
- [ ] Remember me 선택 시 Refresh Token 30일

---

### B2. 워크스페이스 & 팀 관리 (v1.1 확장)

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 워크스페이스 생성 | P0 | slug 기반 URL. 플랜별 제한: Free=1개(Root 포함), Team=무제한 |
| **워크스페이스 리스트 뷰** | P0 | 카드 그리드 아님. 행 기반 리스트. 역할 배지·활동 시간 표시 |
| 멤버 초대 | P0 | 이메일 초대, 72시간 유효 |
| 역할 관리 | P0 | Owner / Admin / Editor / Viewer |
| **가입 신청 (Join Request)** | P0 | 공개 워크스페이스에 비멤버가 신청. 신청 메시지 포함 |
| **가입 신청 관리** | P0 | Admin/Owner: 신청자 검토 → 역할 지정 후 승인/거절. 일괄 처리 |
| **멤버 내보내기** | P1 | CSV(멤버 목록·권한 현황·활동 내역) / PDF 종합 리포트. 기간 필터 |
| **초대 현황** | P1 | 발송된 초대 링크 목록·재발송·취소 |
| 워크스페이스 설정 | P1 | 공개 읽기, 삭제 (이름 확인 필수, Root 워크스페이스 삭제 불가) |

**역할 권한 매트릭스**

| 역할 | 문서 읽기 | 문서 작성 | 멤버 초대 | 설정 변경 | 삭제 | 가입 신청 승인 |
|------|----------|----------|----------|----------|------|---------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**가입 신청 플로우**
1. 비멤버가 워크스페이스 검색 → `가입 신청` 클릭
2. 신청 메시지 입력 (선택) → `POST /workspaces/:id/join-requests`
3. 워크스페이스 설정 > 멤버 관리 > **가입 신청 탭** 에 `대기` 상태로 노출
4. Admin/Owner: 역할 선택 → 승인 (`PATCH /join-requests/:id { status: "approved" }`)
5. 승인 시 → `workspace_members` INSERT + 신청자에게 이메일 알림
6. 거절 시 → 상태 `rejected` 업데이트 + 신청자 알림

**멤버 관리 UI 4탭**

| 탭 | 설명 |
|----|------|
| 멤버 목록 | 현재 멤버 + 역할 드롭다운 변경 + 제거 |
| 가입 신청 | 신청자 메시지 · 역할 선택 · 승인/거절 · 일괄 처리 |
| 초대 현황 | 발송된 초대 링크 + 재발송/취소 |
| 내보내기 | CSV(멤버/권한/활동) · PDF 리포트 · 기간 필터 |

---

### B3. 문서(Document) 관리

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 문서 생성 | P0 | 빈 문서/템플릿, H1 기반 제목 자동 동기화, slug 자동 생성 |
| 문서 목록/탐색 | P0 | 리스트/그리드 뷰, 정렬(이름/수정일/생성일), 필터 |
| 자동 저장 | P0 | 1초 디바운스, 상태 표시 (저장 중/저장됨/변경사항) |
| 버전 히스토리 | P1 | Phase 1: 최대 20개 보관 / Phase 2+: 최대 100개 + diff 표시 + 복원 |
| 문서 삭제 | P0 | Soft Delete → 30일 후 영구 삭제 |

---

### B4. 카테고리(폴더) 관리 `P0` 🚧

> **프로토타입 구현 완료 (v1.2.0):** 사이드바 버튼·컨텍스트 메뉴·모달 UI 구현됨. 실제 데이터 연동은 Phase 1 백엔드 구축 시 완료.

**진입 경로**

| 방법 | 동작 |
|------|------|
| 사이드바 `📁` 버튼 | 새 폴더 만들기 모달 오픈 |
| 사이드바 `＋` 버튼 | 새 문서 만들기 모달 오픈 (카테고리 선택 포함) |
| 폴더 항목 호버 → `⋯` 버튼 | 컨텍스트 메뉴 오픈 |
| 폴더 항목 우클릭 | 컨텍스트 메뉴 오픈 |

**컨텍스트 메뉴 항목**

| 항목 | 동작 | 우선순위 |
|------|------|---------|
| 📄 새 문서 추가 | 해당 폴더를 기본값으로 새 문서 모달 오픈 | P0 🚧 |
| 📁 하위 폴더 추가 | 하위 경로 미리보기 포함 새 폴더 모달 오픈 | P0 🚧 |
| ✏️ 이름 변경 | 폴더 이름 변경 모달 → 사이드바 DOM 즉시 반영 | P0 🚧 |
| ↕️ 위치 이동 | 드래그 앤 드롭 (Phase 1 구현) | P1 📋 |
| 🗑 폴더 삭제 | 이름 입력 확인 → 문서는 루트 이동, 폴더 제거 | P0 🚧 |

**새 폴더 모달 필드**

| 필드 | 설명 |
|------|------|
| 폴더 이름 | 필수. 입력 시 경로 미리보기 실시간 업데이트 |
| 상위 위치 | `select` — 루트 또는 기존 폴더 중 선택 |
| 생성 경로 미리보기 | `MarkFlow Dev / 상위폴더 / 새폴더` 형태 |

**새 문서 모달 필드 (카테고리 선택 추가)**

| 필드 | 설명 |
|------|------|
| 문서 제목 | 필수 |
| 폴더(카테고리) | `select` — 루트 또는 기존 폴더 선택 |
| 시작 방식 | 빈 문서 / 템플릿 선택 (템플릿은 Phase 1) |

**인수 조건**
- [x] 사이드바 섹션 레이블에 `📁`(새 폴더) + `＋`(새 문서) 버튼 표시 🚧
- [x] 폴더 항목 호버 시 `⋯` 버튼 표시 (opacity 0 → 1 transition) 🚧
- [x] 우클릭 컨텍스트 메뉴 (5개 항목) 🚧
- [x] 새 폴더 모달 — 경로 미리보기 실시간 업데이트 🚧
- [x] 폴더 삭제 시 이름 입력 확인(안전장치) 🚧
- [x] 삭제된 폴더의 문서는 루트로 이동 (프로토타입: DOM 제거) 🚧
- [ ] 무제한 중첩 폴더 구조 (백엔드 Closure Table) 📋
- [ ] 드래그-드롭 이동 📋
- [ ] 접기/펼치기 상태 localStorage 유지 📋

---

### B5. 문서 간 링크 시스템 `P0`

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 연관 링크 | P0 | 양방향 연관 관계, 최대 20개 |
| Prev/Next | P0 | 순환 참조 방지 (DFS), DAG Pipeline 내비게이션으로 렌더링 |
| 위키링크 | P1 | `[[문서 제목]]` 구문, 자동완성 |

> **v1.2.0 변경:** 프리뷰 하단 Prev/Next 버튼 쌍(doc-nav) → **DAG Pipeline 내비게이션** 으로 교체. 이전·현재·연관·다음 문서를 파이프라인 스테이지 형태로 한 줄에 표시. 메타 패널 "문서 링크" 섹션도 미니 DAG로 교체.

---

### B6. 링크 URL 프리뷰 `P1`

- [ ] URL 붙여넣기 시 OG 메타데이터 카드 생성
- [ ] 서버사이드 프록시 (CORS 우회), Redis 24시간 캐시
- [ ] YouTube/Vimeo 자동 감지 → 인라인 플레이어

---

### B7. CSS 테마 시스템 `P1`

- [ ] Admin 이상 워크스페이스 단위 CSS 편집 (CodeMirror CSS 모드)
- [ ] CSS 변수 기반 (`--mf-font-body`, `--mf-color-heading` 등)
- [ ] 프리셋: Default, GitHub, Notion, Dark, Academic

---

### B8. 검색 `P1`

- [ ] 전문 검색 (제목 > 첫 단락 > 본문 가중치)
- [ ] `Ctrl+/` 단축키 전역 검색 팝업
- [ ] 카테고리/태그/작성자/날짜 범위 필터

---

### B9. 팀 협업 `P1`

| 기능 | 설명 |
|------|------|
| 실시간 공동 편집 | Yjs CRDT 기반, 최대 30인, 원격 커서 표시 |
| 인라인 댓글 | 텍스트 선택 후 댓글, 스레드형, 해결(Resolve) |
| 활동 피드 (P2) | 워크스페이스 이력, @멘션 알림 |

---

### B11. Root 워크스페이스 `P0` 📋

- [ ] 회원가입(이메일 인증) 완료 시 서버가 **Root 워크스페이스 1개를 자동 생성** (이름: "My Notes", slug: `personal-{uid8}`)
- [ ] Root 워크스페이스는 삭제 불가 (Owner 본인만 소속)
- [ ] 이름 변경 가능, CSS 테마 적용 가능
- [ ] 문서 생성 시 워크스페이스 미지정 → Root 워크스페이스에 자동 귀속

---

### B12. Embed 연동 `P1` 📋

> 원 요구사항: "어떤 프로젝트에도 embed될 수 있도록 독립 구동 환경, 연동 방식에 대한 고민이 깊어야 한다"

**3가지 연동 방식 지원**

| 방식 | 대상 | 설명 |
|------|------|------|
| **① NPM 패키지 (Standalone)** | React/Next.js 앱 | `@markflow/editor` npm install. KMS 백엔드 없이 에디터만 독립 동작. `onSave` prop으로 저장 로직 주입 |
| **② Guest Token (API Key 방식)** | 서드파티 SaaS | 워크스페이스 Admin이 Guest Token 발급 → 외부 앱이 API 헤더에 포함 → 문서 읽기/쓰기 가능. 권한 범위(scope) 설정 가능 |
| **③ iframe + postMessage** | 어떤 환경이든 | `<iframe src="https://app.markflow.io/embed/doc/:id?token=..." />`. 저장/로드 이벤트를 `postMessage`로 부모 창과 통신 |

**인수 조건**
- [ ] Guest Token: 만료일 설정, 읽기 전용/읽기-쓰기 scope 선택
- [ ] iframe 모드: `?readOnly=true`, `?theme=dark`, `?hideToolbar=true` 쿼리 파라미터 지원
- [ ] NPM 패키지: KMS 연결 없이도 동작 (localStorage 저장 폴백)

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| .md Import | P0 | 단일 파일 업로드 |
| .zip Import | P0 | 폴더 구조 유지 |
| .md Export | P0 | 현재 문서 다운로드 |
| .zip Export | P0 | 카테고리 전체 폴더 구조 보존 |
| HTML Export | P1 | 현재 문서를 렌더링된 `.html`로 다운로드 (인라인 CSS 포함) |
| HTML Import | P1 | `.html` 파일을 Turndown으로 Markdown 변환 후 저장 |
| PDF Export | P1 | 서버사이드 Puppeteer 기반 PDF 생성 (워크스페이스 테마 CSS 적용) |
| PDF Import | P2 | PDF 텍스트 추출 후 Markdown 변환 (이미지/표 제한적 지원, 베스트 에포트) |

---

### B13. 문서 구조 다이어그램 `P1` 🚧 (DAG Pipeline 방식으로 전환)

> **v1.2.0 변경:** 기존 SVG force-directed 그래프 → **DAG Pipeline Stage Graph** 방식으로 전환. CI/CD 파이프라인 스타일로 계층·순서·연관 관계를 좌→우 흐름으로 표현.

**시각화 방식 변경 근거**

| 항목 | 구 방식 (SVG 원형 노드) | 신 방식 (DAG Pipeline) |
|------|----------------------|----------------------|
| 순서 관계 표현 | 간접적 (엣지 방향) | 직관적 (좌→우 흐름) |
| 같은 레벨 병렬 항목 | 산재 | 그룹 박스로 묶음 |
| 연관 문서 | 방사형 배치 | 현재 문서 박스 내 수직 스택 |
| 클릭 인터랙션 | 구현 복잡 | 단순 (div 클릭) |

**배치 위치**

| 위치 | 설명 |
|------|------|
| 메타 패널 내 미니 DAG | 에디터 우측 패널 — 항상 표시, 스크롤 가능 |
| 프리뷰 하단 DAG 내비 | 문서 본문 아래 — Prev/Next 링크 대체 |
| 전체 그래프 뷰 페이지 | 사이드바 🔗 메뉴 → 워크스페이스 전체 흐름 표시 |

**스테이지 구조**

```
[Root WS]  ──●──  [카테고리]  ──●──  [이전 문서]  ──●──  [현재 ★    ]  ──●──  [다음 문서]
                                                          [연관 문서 1]
                                                          [연관 문서 2]
```

**노드 색상 코드** (유지)

| 노드 | Fill | Stroke |
|------|------|--------|
| root | #F1F0EC | #CBD5E1 |
| 카테고리 | #EEF3FF | #93C5FD (blue) |
| 현재 문서 | #EEF3FF + accent border | #1A56DB + pulse |
| 이전/다음 | #F0FDF4 | #86EFAC (green) |
| 연관 문서 | #F5F3FF | #C4B5FD (purple) |

**인수 조건**
- [x] 미니 DAG: 메타 패널 내 표시 (전체 보기 버튼 → 그래프 뷰 페이지 이동) 🚧
- [x] 프리뷰 하단 DAG 내비: Prev/Next + 연관 문서 포함 🚧
- [x] 현재 문서 노드 pulse ring 애니메이션 🚧
- [x] 노드 클릭 → 해당 문서 편집기로 이동 🚧
- [ ] 실제 문서 데이터 연동 (백엔드 구축 시) 📋
- [ ] 줌 +/−/1:1 컨트롤 📋

---

### B14. 그래프 뷰 전체 페이지 `P1` 🚧 (신규)

> 워크스페이스의 전체 문서 연결 관계를 DAG Pipeline 방식으로 시각화하는 전용 페이지.

**진입 경로**
- 사이드바 탐색 섹션 → `🔗 그래프 뷰`
- 메타 패널 미니 DAG `전체 보기` 버튼

**페이지 구조**

| 영역 | 내용 |
|------|------|
| 상단 툴바 | 제목 + 워크스페이스 통계 + 범례 + "편집기로 →" 버튼 |
| 본문 | 수평 스크롤 가능한 DAG 파이프라인 그리드 |

**표시 Row 구성**

| Row | 내용 |
|-----|------|
| 카테고리별 문서 순서 흐름 | Root → 카테고리 → 이전 → 현재(+연관) → 다음 |
| 병렬 문서 그룹 | 같은 카테고리 내 동시에 작업 중인 문서들 |
| 태그 연관 클러스터 | 동일 태그를 공유하는 문서들을 그룹 박스로 묶어 표시 |

**인수 조건**
- [x] 페이지 진입 시 사이드바 활성 항목 변경 🚧
- [x] 브레드크럼 업데이트 ("그래프 뷰") 🚧
- [x] 범례 바 (4가지 노드 타입 색상 설명) 🚧
- [x] 노드 클릭 → 에디터로 이동 🚧
- [ ] 실제 문서 그래프 데이터 연동 📋
- [ ] 수평 스크롤 + 줌 컨트롤 📋
- [ ] 필터 (카테고리별·태그별 보기) 📋
