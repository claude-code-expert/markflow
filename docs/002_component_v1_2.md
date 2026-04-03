# 002 — 컴포넌트 설계 (Component Specification)

> **최종 수정:** 2026-03-26 (v1.2.0 반영)
> **스택:** React 18/19 · TypeScript 5 · CodeMirror 6 · unified/remark/rehype · Tailwind CSS 4 · Zustand
> **상태 범례:** ✅ 구현 완료 · 🚧 프로토타입 구현 · 📋 계획됨 (KMS)
> **변경 이력:** v1.2.0 — DAGPipelineGraph·MiniDAGGraph·FolderContextMenu·NewFolderModal·NewDocModal 신규, CategoryTree 폴더 관리 UX 강화

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
1. 드래그-드롭 / 붙여넣기 / 버튼 클릭 → `handleImageUpload(file)`
2. Worker URL 미설정 → Settings 모달 오픈
3. `![Uploading filename...]()`  플레이스홀더 삽입
4. `createCloudflareUploader(workerUrl)(file)` → URL 반환
5. 플레이스홀더를 `![filename](url)` 로 교체

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

## Part B. KMS 앱 컴포넌트 (📋 계획됨)

> 아래는 KMS SaaS 구축 시 에디터 패키지 위에 추가될 컴포넌트 구조

```
App (Next.js App Router)
├── layout.tsx
│   ├── AuthProvider          # JWT 상태 관리
│   ├── QueryProvider         # TanStack Query
│   └── ThemeProvider         # 다크모드
│
├── (auth)/
│   ├── LoginPage → LoginForm, SocialLoginButtons
│   ├── RegisterPage → RegisterForm
│   └── ForgotPasswordPage → ResetPasswordForm  ← M7: 비밀번호 초기화 UX
│
├── embed/
│   └── doc/[documentId]/     ← M5: iframe embed 전용 라우트
│       └── EmbedPage
│           ├── MarkdownEditor (readOnly 또는 편집 모드)
│           └── EmbedBridge   (postMessage ↔ 부모 창 통신)
│
└── (app)/
    ├── WorkspaceSwitcher
    └── [workspaceName]/
        ├── AppShell
        │   ├── Sidebar
        │   │   ├── WorkspaceHeader
        │   │   ├── GlobalSearch (trigger)
        │   │   ├── SidebarSectionLabel          ← 📁 NewFolder + ＋ NewDoc 버튼 포함
        │   │   ├── CategoryTree
        │   │   │   ├── CategoryNode             ← hover ⋯ 버튼 포함
        │   │   │   │   └── FolderContextMenu 🚧 ← 우클릭/⋯ 클릭 시 표시
        │   │   │   └── DocumentNode
        │   │   ├── GraphViewNavItem 🚧          ← 🔗 그래프 뷰 사이드바 항목
        │   │   └── UserMenu
        │   ├── MainContent (router outlet)
        │   └── WorkspaceThemeInjector           ← <style> 동적 주입
        │
        ├── doc/
        │   └── DocumentListPage → DocumentListToolbar, DocumentList/Grid
        │
        ├── graph/
        │   └── GraphViewPage 🚧                ← B14 신규. DAG 전체 워크스페이스 뷰
        │       ├── DAGToolbar                  ← 범례 + 통계 + 이동 버튼
        │       └── DAGPipelineGraph 🚧         ← 카테고리·순서·태그 Row별 렌더링
        │
        └── doc/[docId]/
            └── EditorPage
                ├── MarkdownEditor             ← @markflow/editor 패키지
                ├── DocumentMetaPanel
                │   ├── MiniDAGGraph 🚧        ← B13: 미니 DAG (LinkManager 대체)
                │   ├── TagInput               ← M3: 태그 입력 UI
                │   └── VersionHistoryPanel    ← M8: 버전 목록 + DiffViewer
                ├── PreviewPane
                │   └── DAGPipelineNav 🚧      ← B5: Prev/Next 내비 → DAG 방식
                └── CollaborationLayer (Yjs) → RemoteCursors
```

### 신규 컴포넌트 스펙 (v1.2.0) 🚧

#### `FolderContextMenu`

```typescript
interface FolderContextMenuProps {
  folderName: string
  position: { x: number; y: number }
  onClose: () => void
  onAction: (action: 'new-doc' | 'new-subfolder' | 'rename' | 'move' | 'delete') => void
}
```

| 항목 | 내용 |
|------|------|
| 표시 조건 | 폴더 항목 우클릭 또는 `⋯` 버튼 클릭 |
| 위치 | `position: fixed` — 커서 좌표 기준, 뷰포트 경계 초과 방지 |
| 닫힘 조건 | 외부 클릭, `mouseleave`, `Escape` 키 |
| z-index | 2000 |

#### `NewFolderModal`

```typescript
interface NewFolderModalProps {
  parentFolder?: { id: string; name: string }  // 컨텍스트 메뉴에서 열 때 주입
  onConfirm: (name: string, parentId: string | null) => void
  onClose: () => void
}
```

| 필드 | 동작 |
|------|------|
| 폴더 이름 | 입력 시 `folder-path-preview` 실시간 업데이트 |
| 상위 위치 | `<select>` — 루트 및 기존 폴더 목록 |
| 경로 미리보기 | `WorkspaceName / 상위폴더 / 입력중인이름` |

#### `NewDocModal`

```typescript
interface NewDocModalProps {
  defaultCategoryId?: string  // 폴더 컨텍스트에서 열 때 주입
  onConfirm: (title: string, categoryId: string | null, mode: 'blank' | 'template') => void
  onClose: () => void
}
```

#### `DAGPipelineGraph`

```typescript
interface DAGStage {
  type: 'root' | 'category' | 'prev' | 'current' | 'next' | 'related'
  nodes: DAGNode[]
  label?: string  // 그룹 박스 레이블
}

interface DAGNode {
  id: string
  title: string
  icon: string
  meta?: string
  type: DAGStage['type']
  onClick?: () => void
}

interface DAGPipelineGraphProps {
  rows: DAGPipelineRow[]  // 카테고리별 Row 배열
  compact?: boolean       // MiniDAG 모드
}
```

| 모드 | 사용처 | 특징 |
|------|--------|------|
| 기본 | `GraphViewPage` | 다중 Row, 수평 스크롤 |
| compact (`MiniDAGGraph`) | 메타 패널, 프리뷰 하단 | 단일 Row, 폰트·패딩 축소 |

#### `DAGPipelineNav` (프리뷰 하단)

```typescript
interface DAGPipelineNavProps {
  prevDoc?: { id: string; title: string }
  currentDoc: { id: string; title: string }
  nextDoc?: { id: string; title: string }
  relatedDocs?: Array<{ id: string; title: string }>
  onNavigate: (docId: string) => void
}
```

---

### 상태 관리 (Zustand Stores — 계획)

| Store | 주요 상태 |
|-------|----------|
| `useAuthStore` | user, accessToken, logout(), refreshToken() |
| `useWorkspaceStore` | currentWorkspace, members, themeCss |
| `useEditorStore` | documentId, saveStatus, queueSave() |
| `useSidebarStore` | expandedCategoryIds, toggleCategory(), isSidebarOpen |

### 주요 훅 (계획)

```typescript
// M6: 워크스페이스 테마 CSS 동적 주입 훅
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

// M5: iframe embed postMessage 브릿지 훅
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

### 데이터 페칭 (TanStack Query — 계획)

```typescript
const queryKeys = {
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  categories: (wsId: string) => ['workspaces', wsId, 'categories'] as const,
  documents: (wsId: string, filters?) => ['workspaces', wsId, 'documents', filters] as const,
  document: (wsId: string, docId: string) => ['workspaces', wsId, 'documents', docId] as const,
  versions: (docId: string) => ['documents', docId, 'versions'] as const,
  search: (wsId: string, q: string) => ['search', wsId, q] as const,
}
```
