# MarkFlow Layout System

> **버전:** 1.1.0
> **기준 파일:** `markflow-prototype.html`
> **최종 수정:** 2026-03-26
> **변경 이력:** v1.1.0 — Section 7 사이드바(폴더 관리 버튼·⋯ 메뉴), Section 9.1 메타 패널(미니 DAG 교체), Section 12 전면 개정(DAG Pipeline 방식), Section 14 그래프 뷰 페이지 신규, Section 15 컨텍스트 메뉴 레이어 추가

---

## 1. Layout Tokens

```css
:root {
  --sidebar-w: 260px;   /* 사이드바 고정 너비 */
  --toolbar-h: 48px;    /* 에디터 툴바 높이 */
  --header-h:  56px;    /* 앱 글로벌 헤더 높이 */
}
```

---

## 2. Screen Architecture

MarkFlow는 **6개 최상위 화면(screen)**으로 구성됩니다. 각 화면은 `id="screen-{name}"` 으로 관리되며 JS로 `active` 클래스를 토글합니다.

```
screen-landing      랜딩 페이지 (비인증)
screen-auth         로그인 / 회원가입
screen-verify       이메일 인증 대기
screen-workspaces   워크스페이스 선택
screen-app          메인 앱 (인증 후)
```

---

## 3. Landing Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  NAV  (sticky, 62px, blur backdrop)                     │
│  logo ················· links ············ CTA buttons  │
├─────────────────────────────────────────────────────────┤
│  HERO  (max-width: 1100px, padding: 80px 32px)          │
│  eyebrow pill                                           │
│  H1  (clamp 38–58px)                                    │
│  body text  (max-width: 540px)                          │
│  CTA buttons                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ PREVIEW MOCKUP  (max-width: 980px)              │    │
│  │ fake-toolbar ├ sidebar ├ editor ├ preview       │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  FEATURES  (bg: --surface, max-width: 1100px)           │
│  3-column grid  (auto-fill, minmax 260px)               │
├─────────────────────────────────────────────────────────┤
│  PRICING  (max-width: 1100px)                           │
│  3-column grid (equal)                                  │
├─────────────────────────────────────────────────────────┤
│  FOOTER  (bg: --text)                                   │
│  4-column  ···················· copyright               │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Auth / Verify Layout

```
┌─────────────────────────────────────────────────────────┐
│  FULL VIEWPORT CENTER  (display: flex, align: center)   │
│  bg: --bg                                               │
│                                                         │
│         ┌──────────────────────────┐                    │
│         │ AUTH CARD  (max-w: 440px)│                    │
│         │ border-radius: --xl      │                    │
│         │ shadow: --shadow-lg      │                    │
│         │                          │                    │
│         │ logo                     │                    │
│         │ tab: 로그인 | 회원가입    │                    │
│         │ form fields              │                    │
│         │ social buttons           │                    │
│         └──────────────────────────┘                    │
│         ← back button                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Workspace Selector Layout

```
┌─────────────────────────────────────────────────────────┐
│  NAV  (62px)                                            │
├─────────────────────────────────────────────────────────┤
│  PAGE  (padding: 60px 20px, center, max-w: 680px)       │
│                                                         │
│  title + description + [새 워크스페이스] 버튼            │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │ WS LIST  (--surface, border-radius: --xl)   │        │
│  │ ─────────────────────────────────────────── │        │
│  │ [icon] name        [role] [type]   [›]       │        │
│  │ [icon] name        [role] [type]   [›]       │        │
│  │ [icon] name  pending [취소]                  │        │
│  │ [+ dashed] 새 워크스페이스 만들기             │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │ JOIN PANEL  (아코디언, 접힘 기본값)           │        │
│  │ 공개 워크스페이스에 가입 신청  [▼]            │        │
│  │ ──── (펼치면) ────────────────────────────  │        │
│  │ 검색창                                       │        │
│  │ [icon] ws name  [가입 신청]                  │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## 6. App Shell Layout (메인 앱)

```
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL HEADER  (56px, grid-column: 1/-1)                       │
│  [logo 260px] | breadcrumb ············ [save][collab][icons]   │
├───────────────┬─────────────────────────────────────────────────┤
│               │                                                  │
│  SIDEBAR      │  MAIN CONTENT                                   │
│  (260px)      │  (flex: 1, overflow-y: auto, bg: --bg)          │
│               │                                                  │
│  ws-header    │  page-doclist   (문서 목록)                      │
│  search bar   │  page-editor    (에디터)                         │
│  nav tree     │  page-settings  (설정)                           │
│               │                                                  │
│  [footer]     │                                                  │
│  user+logout  │                                                  │
└───────────────┴─────────────────────────────────────────────────┘

CSS:
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: var(--header-h) 1fr;
  height: 100vh;
  overflow: hidden;
}
```

---

## 7. Sidebar Layout (v1.1.0)

```
┌──────────────────────────────┐  260px
│  WS HEADER  (14px pad)       │
│  [ws-avatar] WS name  [+]    │
├──────────────────────────────┤
│  SEARCH BAR  (10px 12px marg)│
│  🔍 검색...         ⌘/        │
├──────────────────────────────┤
│  SECTION: 문서    [📁] [＋]   │  ← 우측 버튼: 새 폴더 / 새 문서
│  [🗂] 전체 문서      87      │
│  [📁] 001 Requirements  12  ⋯│  ← hover 시 ⋯ 버튼 표시 (opacity 0→1)
│    └[📄] 기능 요구사항        │  ← padding-left: 28px
│    └[📄] 비기능 요구사항      │
│  [📁] 002 Architecture   8  ⋯│
│    └[📄] System Overview     │
│  [📄] Getting Started        │
│  [📄] Roadmap 2026    [New]  │
├──────────────────────────────┤
│  SECTION: 탐색               │  ← 신규 섹션
│  🔗 그래프 뷰                │
├──────────────────────────────┤
│  SECTION: 워크스페이스       │
│  ⚙️ 설정                     │
│  👥 멤버 초대                │
│  📦 가져오기/내보내기         │
├──────────────────────────────┤  margin-top: auto
│  FOOTER                      │
│  [avatar] name / role  [out] │
└──────────────────────────────┘

폴더 ⋯ 버튼:
  - CSS: .folder-item:hover .folder-menu-btn { opacity: 1 }
  - 클릭 또는 우클릭 → FolderContextMenu 표시
  - position: fixed, z-index: 2000

컨텍스트 메뉴 항목:
  📄 새 문서 추가 / 📁 하위 폴더 추가
  ──────────────
  ✏️ 이름 변경 / ↕️ 위치 이동
  ──────────────
  🗑 폴더 삭제 (danger)
```

---

## 8. Document List Page Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  (padding: 28px 32px 20px)                         │
│  "전체 문서"  n개 · 최근 수정 순 ··············· [+ 새 문서] │
├────────────────────────────────────────────────────────────┤
│  TOOLBAR  (padding: 0 32px 16px)                           │
│  [🔍 검색창 max-w:360] [정렬 select] [grid|list] [📥 가져오기]│
├────────────────────────────────────────────────────────────┤
│  GRID VIEW  (auto-fill, minmax 260px, gap 16px, p: 0 32px) │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ DOC CARD │ │ DOC CARD │ │ DOC CARD │                   │
│  │ icon     │ │          │ │          │                   │
│  │ title    │ │          │ │          │                   │
│  │ tags     │ │          │ │          │                   │
│  │ excerpt  │ │          │ │          │                   │
│  │ meta     │ │          │ │          │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                            │
│  LIST VIEW  (padding: 0 32px 32px)  [토글로 전환]           │
│  ┌────────────────────────────────────────────────────┐   │
│  │ [icon] title ···············  tags · meta · [ver]  │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Editor Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  EDITOR SHELL (grid-template-rows: 48px 1fr)                       │
├────────────────────────────────────────────────────────────────────┤
│  TOOLBAR  (48px, --surface, border-bottom)                         │
│  [H1|H2|H3] | [B I S </>] | [≡ ① ☐] | [❞ {} 🔗 🖼 ⊞ ━] | [∑ ∫]  │
│  ────────────────────────────────── margin-left: auto ──────────── │
│  [split|editor|preview] | [meta-panel] [export]                    │
├───────────────────────┬────────────────────────┬───────────────────┤
│  EDITOR PANE          │  PREVIEW PANE           │  META PANEL       │
│  (flex:1)             │  (flex:1)               │  (300px, hidden   │
│                       │                         │   by default,     │
│  header: "Markdown    │  header: "Live Preview" │   toggle 가능)    │
│  Source" | line:col   │  | word count           │                   │
│                       │                         │  tags             │
│  CodeMirror 6         │  remark/rehype HTML     │  category         │
│  textarea             │  render                 │  doc links        │
│  font: JetBrains Mono │  font: DM Sans / Sora   │  doc structure    │
│  13.5px, lh 1.9       │  15px, lh 1.8           │    diagram        │
│                       │  max-width: 740px       │  version history  │
│                       │  pad: 32px 48px         │  collaborators    │
│                       │                         │                   │
│                       │  [prev doc nav]         │                   │
│                       │  [next doc nav]         │                   │
└───────────────────────┴────────────────────────┴───────────────────┘

레이아웃 모드 3종:
  split   = editor(flex:1) + preview(flex:1)          기본값
  editor  = editor(flex:1) + preview(display:none)
  preview = editor(display:none) + preview(flex:1)
```

### 9.1 Meta Panel Detail (300px) — v1.1.0

```
┌──────────────────┐  300px
│ 문서 속성    [✕] │  header: 14px 16px pad
├──────────────────┤
│ TAGS             │  meta-section (16px pad)
│ [tag] [tag] [+]  │
├──────────────────┤
│ 카테고리         │
│ [select]         │
├──────────────────┤
│ 문서 흐름  [전체 보기] │  ← B13: 미니 DAG (LinkManager 교체)
│  [이전]──●──[현재+연관]──●──[다음]  │  ← .mini-dag 스크롤 컨테이너
│  overflow-x: auto                  │
│  [+ 링크 편집]         │
├──────────────────┤
│ 버전 히스토리    │  [전체 보기]
│  v12 현재        │
│  v11  [복원]     │
│  v10  [복원]     │
├──────────────────┤
│ 실시간 편집 중   │
│  [C][J] 2명      │
└──────────────────┘

미니 DAG 노드 사이즈 (compact 모드):
  min-width: 110px / max-width: 140px
  padding: 6px 8px / font-size: 11~12px
  connector-line width: 28px
```

---

## 10. Settings Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  SETTINGS SHELL  (display: flex, height: calc(100vh - 56px))  │
├──────────────────┬─────────────────────────────────────────────┤
│  SETTINGS NAV    │  SETTINGS CONTENT                          │
│  (220px)         │  (flex:1, overflow-y: auto, pad: 36px 40px)│
│                  │                                            │
│  워크스페이스    │  page-title (22px/700)                     │
│  ⚙️ 일반         │  page-desc  (14px/--text-2)                │
│  👥 멤버 관리    │                                            │
│  🎨 CSS 테마     │  [tab-bar]                                 │
│  🔌 임베드 연동  │  [tab-panel content]                       │
│                  │                                            │
│  계정            │                                            │
│  👤 프로필       │                                            │
│  🔒 보안         │                                            │
└──────────────────┴─────────────────────────────────────────────┘
```

### 10.1 Members Page Sub-tabs

```
탭 1: 멤버 목록   — 현재 멤버 리스트 + 역할 변경 + 제거
탭 2: 가입 신청 2 — 신청자 검토 (승인/거절) + 역할 선택
탭 3: 초대 현황   — 발송된 초대 링크 + 재발송/취소
탭 4: 내보내기    — CSV/PDF 다운로드 + 기간 필터
```

---

## 11. Modal Sizes

| 클래스 | max-width | 용도 |
|--------|-----------|------|
| `.modal` (기본) | 560px | 초대, 링크 설정, 가입 신청 |
| `.modal-lg` | 800px | Import/Export, 버전 히스토리 |
| `.modal-xl` | 1000px | 문서 구조 다이어그램 |

모든 모달: `max-height: 90vh`, `overflow-y: auto`  
오버레이: `rgba(0,0,0,.35)` + `backdrop-filter: blur(2px)`

---

## 12. DAG Pipeline Graph Layout (v1.1.0 — 전면 개정)

> **방식 변경:** SVG force-directed 그래프 → DAG Pipeline Stage Graph (CI/CD 파이프라인 스타일)

### 12.1 그래프 뷰 전체 페이지 (page-graph)

```
┌──────────────────────────────────────────────────────────────┐
│  DAG TOOLBAR  (48px, --surface, border-bottom)               │
│  🔗 문서 그래프 뷰  MarkFlow Dev · 87개 문서                  │
│  ──────────────────────────────── margin-left: auto ──────── │
│  [■회색 카테고리] [■초록 이전/다음] [■파랑 현재] [■보라 연관] │
│                                              [편집기로 →]    │
├──────────────────────────────────────────────────────────────┤
│  DAG BODY  (flex:1, overflow: auto, padding: 40px 32px)      │
│  background: --bg                                            │
│                                                              │
│  Row Label: "001 Requirements · 문서 순서 흐름"             │
│                                                              │
│  [Root WS]──●──[카테고리]──●──[이전 문서]──●──[현재+연관  ]──●──[다음 문서]
│                                             [연관 문서 1  ]
│                                             [연관 문서 2  ]
│                                                              │
│  Row Label: "002 Architecture · 문서 순서 흐름"             │
│  [Root WS]──●──[카테고리]──●──[병렬 그룹             ]──●──[다음]
│                             [doc-a  1m 46s ✓         ]
│                             [doc-b  2m 7s  ✓         ]
│                             [doc-c  1m 39s ✓         ]
│                                                              │
│  Row Label: "태그 연관 클러스터"                             │
│  [#requirements   ]──●──[#backend      ]──●──[#roadmap   ]  │
│  [doc1 ✓          ]     [doc-a ↗        ]     [doc-e ✓   ]  │
│  [doc2 ✓          ]     [doc-b ↗        ]                   │
└──────────────────────────────────────────────────────────────┘

min-width: max-content (수평 스크롤)
```

### 12.2 DAG 컴포넌트 치수

| 컴포넌트 | 속성 | 값 |
|---------|------|-----|
| `.dag-node` | min-width | 200px |
| `.dag-node` | max-width | 260px |
| `.dag-node` | padding | 10px 16px |
| `.dag-connector-line` | width | 48px |
| `.dag-connector::before/after` | 도트 크기 | 8×8px |
| `.dag-group` | min-width | 240px |
| `.dag-group` | padding | 10px, gap 8px |

### 12.3 노드 색상 코드

| 노드 타입 | CSS 클래스 | Fill | Stroke |
|----------|-----------|------|--------|
| Root / 카테고리 (일반) | `.root-node` | `--surface-2` | `--border-2` |
| 카테고리 | `.category` | `--accent-2` | `#93C5FD` |
| 이전/다음 | `.prev-next` | `--green-lt` | `#86EFAC` |
| 현재 문서 | `.current` | `--accent-2` | `--accent` + pulse |
| 연관 문서 | `.related` | `--purple-lt` | `#C4B5FD` |

### 12.4 Pulse 애니메이션

```css
@keyframes dag-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(26,86,219,.4); }
  70%  { box-shadow: 0 0 0 8px rgba(26,86,219,.0); }
  100% { box-shadow: 0 0 0 0   rgba(26,86,219,.0); }
}
.dag-node.current { animation: dag-pulse 2.4s infinite; }
```

### 12.5 미니 DAG (메타 패널 / 프리뷰 하단)

```
compact 모드 (.mini-dag):
  node min-width: 110~120px / max-width: 140~160px
  connector-line width: 28px
  connector dot: 6×6px
  padding: 6~7px 8~10px
  font-size: 11~12px
```

### 12.6 컨텍스트 메뉴 (.ctx-menu)

```
position: fixed / z-index: 2000
background: --surface / border: --border
border-radius: --radius / box-shadow: --shadow-lg
padding: 6px / min-width: 200px

항목 (.ctx-menu-item):
  padding: 8px 12px / font-size: 13px
  hover: background --surface-2

구분선 (.ctx-menu-sep):
  height: 1px / background: --border / margin: 4px 0

danger 항목:
  hover: background --red-lt / color --red
```

---

## 13. Workspace Selector Layout Detail

```
┌─────────────────────────────────────────────────┐  max-w: 680px
│  HEADER ROW                                     │
│  title + desc ·················· [새 워크스페이스]│
├─────────────────────────────────────────────────┤
│  WS LIST  (--surface, border-radius: --xl)      │
│  ┌─────────────────────────────────────────┐    │
│  │ [icon 40px] name                        │    │  16px 20px pad
│  │             meta (멤버·문서·활동)        │    │
│  │                        [role] [type] [›]│    │
│  ├─────────────────────────────────────────┤    │
│  │  ...repeat per workspace...            │    │
│  ├─────────────────────────────────────────┤    │
│  │ [icon 대기] name  [승인 대기] [취소]     │    │  opacity: .75
│  ├─────────────────────────────────────────┤    │
│  │ [+ dashed] 새 워크스페이스  ············ [›]│    │  hover: accent
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  JOIN PANEL  (아코디언)                         │
│  header: "공개 워크스페이스 가입 신청"  [▼/▲]   │
│  ┌──────────────────────────────────────────┐   │
│  │ [🔍 검색...]                             │   │  (펼쳤을 때)
│  │ [icon] ws-name  meta  [가입 신청 btn]    │   │
│  │ [icon] ws-name  meta  [가입 신청 btn]    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 14. Responsive Breakpoints

| Breakpoint | 변화 |
|------------|------|
| `≤ 768px` | features grid → 1-col, pricing grid → 1-col, app sidebar → hidden |
| `≤ 1024px` | hero max-width 제한, preview mockup 축소 |
| `≥ 1280px` | 최적 레이아웃 (설계 기준) |

> Phase 2에서 모바일 반응형 완전 구현 예정. 현재 768px 이하 기본 처리만 포함.

---

## 15. Z-index Stack (v1.1.0)

```
0     일반 콘텐츠
50    앱 헤더 (.app-header)
100   네비게이션 바 (sticky)
1000  모달 오버레이 (.modal-overlay)
2000  컨텍스트 메뉴 (.ctx-menu)  ← 신규 (모달 위에 렌더링)
9999  토스트 알림 (.toast)
```
