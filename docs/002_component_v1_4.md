# 002 — 컴포넌트 설계 (Component Specification)

> **버전:** 1.4.0
> **최종 수정:** 2026-04-06
> **스택:** React 19.2.4 · Next.js 16.2.1 · TypeScript 5+ (strict) · CodeMirror 6 · unified/remark/rehype · Tailwind CSS 4 · Zustand 5.0.0 · @tanstack/react-query 5.72.0
> **상태 범례:** ✅ 구현 완료 · 🚧 프로토타입 구현 · 📋 계획됨
> **변경 이력:**
> - v1.4.0 — 이미지 저장소 설정 페이지에 업로드 토글·사용법 도움말·CTA→우측 가이드 패널 추가, 에디터 이미지 업로드 토글 연동, StorageGuidePanel 설정 페이지 재사용
> - v1.3.0 — 실제 구현된 38개 컴포넌트 전수 반영, Zustand 5개 스토어 구조 문서화, use-permissions 훅(16개 권한) 추가, 프레젠테이션·Join Request 컴포넌트 추가
> - v1.2.0 — DAGPipelineGraph·MiniDAGGraph·FolderContextMenu·NewFolderModal·NewDocModal 신규, CategoryTree 폴더 관리 UX 강화

---

## Part A. 에디터 패키지 (`@markflow/editor`) ✅

### 1. 컴포넌트 트리

```
@markflow/editor
└── MarkdownEditor              ← 루트 컴포넌트
    ├── Toolbar                 ← 서식/레이아웃/테마/이미지 업로드 버튼
    ├── SettingsModal           ← Cloudflare Worker URL 설정
    ├── EditorPane              ← CodeMirror 6 래퍼
    └── PreviewPane             ← remark/rehype HTML 렌더링
```

---

### 2. `MarkdownEditor` (루트 컴포넌트)

**파일:** `packages/editor/src/MarkdownEditor.tsx`

```typescript
interface MarkdownEditorProps {
  // Controlled
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void

  // Layout
  layout?: 'split' | 'editor' | 'preview'   // default: 'split'
  height?: string                             // default: '600px'

  // Appearance
  theme?: 'light' | 'dark'                   // default: 'light'
  themeVars?: Record<string, string>          // CSS 변수 오버라이드
  className?: string

  // Behaviour
  placeholder?: string
  readOnly?: boolean

  // Image upload
  onImageUpload?: (file: File) => Promise<string>  // 커스텀 업로더
}
```

**내부 상태**
```typescript
{
  internalValue: string           // uncontrolled 모드 값
  layout: EditorLayout            // split | editor | preview
  theme: EditorTheme              // light | dark
  editorScrollRatio: number       // 스크롤 동기화
  previewScrollRatio: number
  settingsOpen: boolean           // 설정 모달 표시
  workerUrl: string               // Cloudflare Worker URL
}
```

**이미지 업로드 흐름**
1. 이미지 업로드 토글 확인 (`isImageUploadEnabled()`)
   - OFF → 업로드 비활성화, 버튼 클릭 시 `/settings/storage`로 이동
2. 드래그-드롭 / 붙여넣기 / 버튼 클릭 → `handleImageUpload(file)`
3. Worker URL 미설정 → StorageGuidePanel 열기 (에디터/설정 페이지 공용)
4. `![Uploading filename...]()`  플레이스홀더 삽입
5. `createCloudflareUploader(workerUrl)(file)` → URL 반환
6. 플레이스홀더를 `![filename](url)` 로 교체

---

### 3. `Toolbar`

**파일:** `packages/editor/src/toolbar/Toolbar.tsx`

```typescript
interface ToolbarProps {
  onAction: (action: ToolbarAction) => void
  layout: EditorLayout
  onLayoutChange: (layout: EditorLayout) => void
  theme: EditorTheme
  onThemeChange: (theme: EditorTheme) => void
  onSettingsClick: () => void
  onImageUploadClick: () => void
  hasImageUpload: boolean
}
```

**ToolbarAction 유니온 타입**
```typescript
type ToolbarAction =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'bold' | 'italic' | 'strikethrough' | 'code' }
  | { type: 'codeblock'; lang?: string }
  | { type: 'blockquote' | 'ul' | 'ol' | 'task' }
  | { type: 'link' | 'image' | 'table' | 'hr' }
  | { type: 'math-inline' | 'math-block' }
```

---

### 4. `EditorPane`

**파일:** `packages/editor/src/editor/EditorPane.tsx`

```typescript
interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  theme: EditorTheme
  placeholder?: string
  readOnly?: boolean
  onScrollRatio?: (ratio: number) => void
  scrollRatio?: number                        // 외부에서 스크롤 제어
}
```

**CodeMirror 6 Extension 구성**
```typescript
const extensions = [
  // Language
  markdown({ base: markdownLanguage, codeLanguages: languages }),

  // Editing
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
  EditorView.lineWrapping,
  scrollPastEnd(),

  // Compartments (hot-swap)
  themeCompartment.of(lightTheme),        // light | oneDark
  readOnlyCompartment.of(EditorState.readOnly.of(false)),
  placeholderCompartment.of(placeholder('Start writing…')),

  // Listeners
  EditorView.updateListener.of(onDocChange),
  EditorView.domEventHandlers({ scroll: onScroll }),
]
```

**ref 노출:** `EditorView` 인스턴스를 `forwardRef`로 부모에 전달

---

### 5. `PreviewPane`

**파일:** `packages/editor/src/preview/PreviewPane.tsx`

```typescript
interface PreviewPaneProps {
  markdown: string
  theme: EditorTheme
  scrollRatio?: number
  onScrollRatio?: (ratio: number) => void
}
```

**렌더링 파이프라인**
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

### 6. `SettingsModal`

**파일:** `packages/editor/src/toolbar/SettingsModal.tsx`

- Cloudflare Worker URL 입력/저장
- `localStorage`에 URL 영속화 (`getSavedWorkerUrl()`)

---

### 7. 유틸리티

| 파일 | 함수 | 설명 |
|------|------|------|
| `utils/parseMarkdown.ts` | `parseMarkdown(md)` | unified 파이프라인으로 MD → HTML |
| `utils/markdownActions.ts` | `applyToolbarAction(view, action)` | CodeMirror EditorView에 서식 적용 |
| `utils/cloudflareUploader.ts` | `createCloudflareUploader(url)` | Cloudflare R2 Workers 업로더 팩토리 |

---

### 8. 스타일시트 구조

```
packages/editor/src/styles/
├── variables.css          ← CSS 변수 정의 (색상, 폰트, 간격)
├── theme-light.css        ← [data-theme="light"] 스타일
├── theme-dark.css         ← [data-theme="dark"] 스타일
├── editor.css             ← .mf-root, .mf-panes-container 등
├── toolbar.css            ← .mf-toolbar 버튼 스타일
├── editor-pane.css        ← 에디터 패널 레이아웃
├── preview-pane.css       ← 미리보기 패널 레이아웃
├── codemirror.css         ← CodeMirror 커스텀 스타일
├── preview-content.css    ← 미리보기 HTML 렌더링 스타일
└── settings-modal.css     ← 설정 모달 스타일
```

**네임스페이스:** 모든 CSS 클래스에 `.mf-` 접두사 사용

---

### 9. Public API (exports)

```typescript
// 컴포넌트
export { MarkdownEditor } from './MarkdownEditor'

// 타입
export type {
  MarkdownEditorProps, EditorLayout, EditorTheme,
  ToolbarAction, ToolbarProps, EditorPaneProps, PreviewPaneProps
}

// 유틸리티
export { parseMarkdown } from './utils/parseMarkdown'
export { applyToolbarAction } from './utils/markdownActions'
export { createCloudflareUploader } from './utils/cloudflareUploader'

// 스타일 (사이드 이펙트)
import '@markflow/editor/styles'  // → dist/index.css
```

---

### 10. 빌드 설정

| 항목 | 값 |
|------|-----|
| 빌드 도구 | tsup |
| 출력 형식 | ESM (`dist/index.js`) + CJS (`dist/index.cjs`) |
| 타입 | `dist/index.d.ts` |
| CSS | `dist/index.css` (모든 스타일 번들) |
| banner | `'use client'` (Next.js App Router 호환) |

---

## Part B. KMS 앱 컴포넌트 (✅ Phase 1 구현 완료)

> Phase 1에서 실제 구현된 38개 컴포넌트를 카테고리별로 정리한다.

### 1. 컴포넌트 인벤토리 (38개)

#### 레이아웃 (3)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `sidebar` | 사이드바 네비게이션 (카테고리 트리, 그래프 뷰 링크 포함) | ✅ |
| `app-header` | 앱 상단 헤더 (브레드크럼, 워크스페이스 전환) | ✅ |
| `toast-provider` | 글로벌 토스트 알림 렌더러 | ✅ |

#### 모달/다이얼로그 (10)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `create-workspace-modal` | 워크스페이스 생성 마법사 | ✅ |
| `new-doc-modal` | 새 문서 생성 (제목, 폴더, 시작 방식) | ✅ |
| `new-folder-modal` | 새 폴더 생성 (경로 미리보기 포함) | ✅ |
| `search-modal` | 전역 검색 (`Ctrl+/`) | ✅ |
| `profile-edit-modal` | 프로필 편집 (이름, 아바타, 비밀번호) | ✅ |
| `import-export-modal` | Import/Export 기능 (.md, .zip) | ✅ |
| `version-history-modal` | 버전 히스토리 전체 보기 | ✅ |
| `document-links-modal` | 문서 링크 관리 (연관, Prev/Next) | ✅ |
| `dag-structure-modal` | DAG 구조 전체 보기 | ✅ |
| `confirm-dialog` | 범용 확인 다이얼로그 (삭제 확인 등) | ✅ |

#### 문서 편집 패널 (4)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `document-meta-panel` | 문서 메타 정보 (태그, 링크, 미니 DAG) | ✅ |
| `version-history-panel` | 버전 목록 + DiffViewer | ✅ |
| `comment-panel` | 댓글 생성/삭제/중첩 스레드 | ✅ |
| `link-preview` | URL OG 메타데이터 미리보기 | ✅ |

#### 문서 관리 (4)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `category-tree` | 사이드바 카테고리/폴더 트리 | ✅ |
| `doc-context-menu` | 문서 항목 우클릭 컨텍스트 메뉴 | ✅ |
| `folder-context-menu` | 폴더 항목 컨텍스트 메뉴 (5개 항목) | ✅ |
| `tag-input` | 태그 입력 UI (자동완성) | ✅ |

#### 그래프 (3)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `dag-pipeline-graph` | DAG 전체 워크스페이스 파이프라인 그래프 | ✅ |
| `dag-pipeline-nav` | 프리뷰 하단 Prev/Next DAG 내비게이션 | ✅ |
| `mini-dag-diagram` | 메타 패널 내 미니 DAG | ✅ |

#### 특수 기능 (2)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `presentation-mode` | 프레젠테이션 모드 (어노테이션, TOC, 폰트 조절) | ✅ |
| `join-request-panel` | 가입 요청 관리 (승인/거절/일괄 처리) | ✅ |

#### 랜딩 (5)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `nav-bar` | 랜딩 페이지 상단 네비게이션 | ✅ |
| `hero` | 히어로 섹션 | ✅ |
| `features-grid` | 기능 소개 그리드 | ✅ |
| `pricing-section` | 요금제 안내 | ✅ |
| `footer` | 푸터 | ✅ |

#### 설정 (2)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `invite-status-tab` | 초대 현황 탭 (발송/재발송/취소) | ✅ |
| `member-export-tab` | 멤버 내보내기 탭 (CSV/PDF, 기간 필터) | ✅ |

#### 상태 표시 (3)

| 컴포넌트 | 설명 | 상태 |
|----------|------|------|
| `loading` | 로딩 스피너/스켈레톤 | ✅ |
| `error` | 에러 상태 표시 (재시도 버튼 포함) | ✅ |
| `empty` | 빈 상태 안내 (가이드 액션 포함) | ✅ |

---

### 2. 컴포넌트 트리 (KMS 앱)

```
App (Next.js 16.2.1 App Router)
├── layout.tsx
│   ├── AuthProvider          # JWT 상태 관리
│   ├── QueryProvider         # TanStack Query
│   ├── ThemeProvider         # 다크모드
│   └── ToastProvider         # 글로벌 토스트
│
├── (auth)/
│   ├── LoginPage → LoginForm
│   ├── RegisterPage → RegisterForm
│   └── ForgotPasswordPage → ResetPasswordForm
│
├── (landing)/
│   └── LandingPage
│       ├── NavBar
│       ├── Hero
│       ├── FeaturesGrid
│       ├── PricingSection
│       └── Footer
│
├── embed/
│   └── doc/[documentId]/
│       └── EmbedPage
│           ├── MarkdownEditor (readOnly 또는 편집 모드)
│           └── EmbedBridge   (postMessage ↔ 부모 창 통신)
│
├── invite/[token]/
│   └── InvitePage            # 초대 링크 수락
│
└── (app)/
    ├── WorkspaceSwitcher
    └── [workspaceName]/
        ├── AppShell
        │   ├── Sidebar
        │   │   ├── WorkspaceHeader
        │   │   ├── GlobalSearch (trigger)
        │   │   ├── SidebarSectionLabel
        │   │   ├── CategoryTree
        │   │   │   ├── CategoryNode → FolderContextMenu
        │   │   │   └── DocumentNode → DocContextMenu
        │   │   ├── GraphViewNavItem
        │   │   └── UserMenu
        │   ├── AppHeader
        │   ├── MainContent (router outlet)
        │   └── WorkspaceThemeInjector
        │
        ├── doc/
        │   └── DocumentListPage → DocumentListToolbar, DocumentList/Grid
        │
        ├── graph/
        │   └── GraphViewPage
        │       ├── DAGToolbar
        │       └── DAGPipelineGraph
        │
        ├── trash/
        │   └── TrashPage → 휴지통 (복원/영구 삭제)
        │
        ├── settings/
        │   └── SettingsPage
        │       ├── MemberListTab
        │       ├── JoinRequestPanel
        │       ├── InviteStatusTab
        │       ├── MemberExportTab
        │       └── ThemeSettingsTab
        │
        └── doc/[docId]/
            └── EditorPage
                ├── MarkdownEditor             ← @markflow/editor 패키지
                ├── DocumentMetaPanel
                │   ├── MiniDAGDiagram
                │   ├── TagInput
                │   └── VersionHistoryPanel
                ├── CommentPanel
                ├── PresentationMode           ← 전체화면 프레젠테이션
                ├── PreviewPane
                │   └── DAGPipelineNav
                └── LinkPreview
```

---

### 3. 상태 관리 (Zustand 5.0.0 — 5개 스토어)

| Store | 주요 메서드 | 설명 |
|-------|------------|------|
| **auth-store** | `login()`, `logout()`, `fetchUser()`, `setUser()` | JWT 인증 상태, 사용자 정보 |
| **workspace-store** | `fetchWorkspaces()`, `setCurrentWorkspace()` | 워크스페이스 목록, 현재 활성 워크스페이스 |
| **editor-store** | `setDocument()`, `setContent()`, `setTitle()`, `setSaveStatus()`, `reset()` | 문서 편집 상태, 자동 저장 |
| **sidebar-store** (persist) | `toggleCategory()`, `toggleSidebar()`, `expandCategory()`, `collapseCategory()` | 사이드바 열림/닫힘, 카테고리 접기/펼치기 (localStorage 영속) |
| **toast-store** | `addToast()`, `removeToast()`, `clearAll()` | 글로벌 토스트 알림 큐 |

---

### 4. `use-permissions` 훅

**역할 레벨 (4단계)**

| 역할 | 레벨 |
|------|------|
| Owner | 4 |
| Admin | 3 |
| Editor | 2 |
| Viewer | 1 |

**16개 세분화 권한**

| 권한 | Owner (4) | Admin (3) | Editor (2) | Viewer (1) |
|------|-----------|-----------|------------|------------|
| `canViewDocuments` | ✅ | ✅ | ✅ | ✅ |
| `canCreateDocuments` | ✅ | ✅ | ✅ | - |
| `canEditDocuments` | ✅ | ✅ | ✅ | - |
| `canDeleteDocuments` | ✅ | ✅ | ✅ | - |
| `canManageTags` | ✅ | ✅ | ✅ | - |
| `canManageLinks` | ✅ | ✅ | ✅ | - |
| `canCreateComments` | ✅ | ✅ | ✅ | ✅ |
| `canDeleteOwnComments` | ✅ | ✅ | ✅ | ✅ |
| `canInviteMembers` | ✅ | ✅ | - | - |
| `canManageMembers` | ✅ | ✅ | - | - |
| `canApproveJoinRequests` | ✅ | ✅ | - | - |
| `canManageEmbedTokens` | ✅ | ✅ | - | - |
| `canEditWorkspaceSettings` | ✅ | ✅ | - | - |
| `canEditTheme` | ✅ | ✅ | - | - |
| `canDeleteWorkspace` | ✅ | - | - | - |
| `canTransferOwnership` | ✅ | - | - | - |

**사용 패턴**
```typescript
const { canEditDocuments, canInviteMembers, canDeleteWorkspace } = usePermissions()

if (!canEditDocuments) return <ReadOnlyBanner />
```

---

### 5. 주요 훅

```typescript
// 워크스페이스 테마 CSS 동적 주입 훅
function useWorkspaceTheme(workspaceId: string, themeCss: string) {
  useEffect(() => {
    const id = `mf-ws-theme-${workspaceId}`
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = id
      document.head.appendChild(el)
    }
    el.textContent = themeCss
    return () => { document.getElementById(id)?.remove() }
  }, [workspaceId, themeCss])
}

// iframe embed postMessage 브릿지 훅
function useEmbedBridge(onContentChange: (content: string) => void) {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'mf:set-content') onContentChange(e.data.content)
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ type: 'mf:ready' }, '*')
    return () => window.removeEventListener('message', handler)
  }, [onContentChange])
}
```

---

### 6. 데이터 페칭 (TanStack Query 5.72.0)

```typescript
const queryKeys = {
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  categories: (wsId: string) => ['workspaces', wsId, 'categories'] as const,
  documents: (wsId: string, filters?) => ['workspaces', wsId, 'documents', filters] as const,
  document: (wsId: string, docId: string) => ['workspaces', wsId, 'documents', docId] as const,
  versions: (docId: string) => ['documents', docId, 'versions'] as const,
  comments: (docId: string) => ['documents', docId, 'comments'] as const,
  embedTokens: (wsId: string) => ['workspaces', wsId, 'embed-tokens'] as const,
  joinRequests: (wsId: string) => ['workspaces', wsId, 'join-requests'] as const,
  search: (wsId: string, q: string) => ['search', wsId, q] as const,
  trash: (wsId: string) => ['workspaces', wsId, 'trash'] as const,
}
```

---

### 7. 기술 스택 확정

| 기술 | 버전 | 비고 |
|------|------|------|
| React | 19.2.4 | |
| Next.js | 16.2.1 | App Router |
| TypeScript | 5+ | strict mode, `any` 금지 |
| Zustand | 5.0.0 | 5개 스토어 |
| @tanstack/react-query | 5.72.0 | 서버 상태 관리 |
| Tailwind CSS | 4 | |
| CodeMirror | 6 | 에디터 패키지 |
| unified/remark/rehype | latest | 마크다운 파이프라인 |
