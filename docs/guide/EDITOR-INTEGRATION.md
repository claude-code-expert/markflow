# MarkFlow Editor 소스 복사 연동 가이드

> **버전:** 0.1.0 | **최종 수정:** 2026-04-09

외부 React 프로젝트에 `@markflow/editor` 소스를 직접 복사하여 연동하는 방법을 안내합니다.

---

## 목차

1. [요구 사항](#1-요구-사항)
2. [소스 복사](#2-소스-복사)
3. [의존성 설치](#3-의존성-설치)
4. [프로젝트 설정](#4-프로젝트-설정)
5. [기본 사용법](#5-기본-사용법)
6. [Props API 레퍼런스](#6-props-api-레퍼런스)
7. [이미지 업로드 연동](#7-이미지-업로드-연동)
8. [위키링크 자동완성 연동](#8-위키링크-자동완성-연동)
9. [테마 커스터마이징](#9-테마-커스터마이징)
10. [유틸리티 단독 사용](#10-유틸리티-단독-사용)
11. [Next.js 연동 가이드](#11-nextjs-연동-가이드)
12. [트러블슈팅](#12-트러블슈팅)

---

## 1. 요구 사항

| 항목 | 버전 |
|------|------|
| React | ^18.0.0 \|\| ^19.0.0 |
| React DOM | ^18.0.0 \|\| ^19.0.0 |
| TypeScript | ^5.0 |
| Node.js | ^18.0.0 |

---

## 2. 소스 복사

### 2.1 복사 대상

원본 경로: `packages/editor/src/`

프로젝트 내 원하는 위치에 전체 디렉토리를 복사합니다.

```bash
# 예시: Next.js 프로젝트의 경우
cp -r packages/editor/src/ your-project/src/components/markflow-editor/
```

### 2.2 복사 후 디렉토리 구조

```
your-project/
└── src/
    └── components/
        └── markflow-editor/
            ├── index.ts                  ← Public API (barrel export)
            ├── types/
            │   └── index.ts              ← 타입 정의
            ├── MarkdownEditor.tsx         ← 루트 컴포넌트
            ├── editor/
            │   └── EditorPane.tsx         ← CodeMirror 6 래퍼
            ├── preview/
            │   └── PreviewPane.tsx        ← 마크다운 → HTML 렌더링
            ├── toolbar/
            │   ├── Toolbar.tsx            ← 포맷팅 툴바
            │   ├── SettingsModal.tsx       ← Cloudflare R2 설정 모달
            │   └── ImageUploadGuide.tsx    ← 이미지 업로드 가이드 모달
            ├── utils/
            │   ├── parseMarkdown.ts        ← MD → HTML 파이프라인
            │   ├── markdownActions.ts      ← 툴바 액션 핸들러
            │   ├── cloudflareUploader.ts   ← R2 업로드 팩토리
            │   ├── imageValidation.ts      ← 이미지 파일 검증
            │   └── wordCount.ts            ← 단어 수 카운터
            ├── styles/
            │   ├── variables.css           ← CSS 커스텀 프로퍼티
            │   ├── theme-light.css         ← 라이트 테마
            │   ├── theme-dark.css          ← 다크 테마
            │   ├── editor.css              ← 루트 & 패인 레이아웃
            │   ├── toolbar.css             ← 툴바 UI
            │   ├── editor-pane.css         ← CodeMirror 컨테이너
            │   ├── preview-pane.css        ← 프리뷰 컨테이너
            │   ├── preview-content.css     ← 렌더링된 마크다운 스타일
            │   ├── codemirror.css          ← CodeMirror 오버라이드
            │   └── settings-modal.css      ← 모달 스타일
            └── css-modules.d.ts            ← CSS import 타입 선언
```

### 2.3 index.ts 수정

소스를 복사한 후, `index.ts`의 CSS side-effect import는 그대로 둡니다. 만약 CSS import를 별도 진입점에서 관리하고 싶다면, `index.ts` 하단의 CSS import 블록을 제거하고 [4.2 CSS 설정](#42-css-설정)에서 수동으로 import합니다.

```typescript
// markflow-editor/index.ts — 현재 구조 그대로 사용 가능
export { MarkdownEditor } from './MarkdownEditor'
export type {
  MarkdownEditorProps,
  EditorLayout,
  EditorTheme,
  ToolbarAction,
  ToolbarProps,
  EditorPaneProps,
  PreviewPaneProps,
  WikiLinkItem,
} from './types'
export { parseMarkdown } from './utils/parseMarkdown'
export { applyToolbarAction } from './utils/markdownActions'
export { createCloudflareUploader } from './utils/cloudflareUploader'
export { validateImageFile } from './utils/imageValidation'

// Side-effect: CSS (이 블록이 있으면 import만으로 스타일 자동 적용)
import './styles/variables.css'
import './styles/theme-light.css'
import './styles/theme-dark.css'
import './styles/editor.css'
import './styles/toolbar.css'
import './styles/editor-pane.css'
import './styles/preview-pane.css'
import './styles/codemirror.css'
import './styles/preview-content.css'
import './styles/settings-modal.css'
```

---

## 3. 의존성 설치

### 3.1 CodeMirror 6 (소스 에디터)

```bash
npm install @codemirror/autocomplete@^6.20.1 \
  @codemirror/commands@^6.10.3 \
  @codemirror/lang-markdown@^6.5.0 \
  @codemirror/language-data@^6.5.2 \
  @codemirror/state@^6.6.0 \
  @codemirror/theme-one-dark@^6.1.3 \
  @codemirror/view@^6.40.0
```

### 3.2 Unified 마크다운 파이프라인 (프리뷰)

```bash
npm install unified@^11.0.5 \
  remark-parse@^11.0.0 \
  remark-gfm@^4.0.1 \
  remark-math@^6.0.0 \
  remark-rehype@^11.1.2 \
  rehype-highlight@^7.0.2 \
  rehype-katex@^7.0.1 \
  rehype-raw@^7.0.0 \
  rehype-sanitize@^6.0.0 \
  rehype-stringify@^10.0.1
```

### 3.3 유틸리티

```bash
npm install deepmerge-ts@^7.1.5 \
  katex@^0.16.42 \
  lucide-react@^0.460.0
```

### 3.4 전체 한 줄 설치 (복사용)

```bash
npm install @codemirror/autocomplete @codemirror/commands @codemirror/lang-markdown @codemirror/language-data @codemirror/state @codemirror/theme-one-dark @codemirror/view unified remark-parse remark-gfm remark-math remark-rehype rehype-highlight rehype-katex rehype-raw rehype-sanitize rehype-stringify deepmerge-ts katex lucide-react
```

> **pnpm 사용 시:** `npm install` 대신 `pnpm add`로 대체

---

## 4. 프로젝트 설정

### 4.1 TypeScript 설정

`tsconfig.json`에서 다음을 확인합니다:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "moduleResolution": "bundler",    // 또는 "node16"
    "allowImportingTsExtensions": false
  }
}
```

### 4.2 CSS 설정

에디터 소스의 `index.ts`에 CSS side-effect import가 포함되어 있으므로, 컴포넌트를 import하면 스타일이 자동으로 로드됩니다.

**방법 A: 자동 (권장)**

별도 설정 불필요. 컴포넌트 import만으로 스타일 적용:

```tsx
import { MarkdownEditor } from '@/components/markflow-editor'
// CSS는 index.ts의 side-effect import로 자동 로드됨
```

**방법 B: 수동 (CSS import를 별도로 관리할 경우)**

`index.ts`에서 CSS import 블록을 제거하고, 글로벌 진입점(예: `layout.tsx`, `globals.css`)에서 직접 import:

```css
/* globals.css */
@import '../components/markflow-editor/styles/variables.css';
@import '../components/markflow-editor/styles/theme-light.css';
@import '../components/markflow-editor/styles/theme-dark.css';
@import '../components/markflow-editor/styles/editor.css';
@import '../components/markflow-editor/styles/toolbar.css';
@import '../components/markflow-editor/styles/editor-pane.css';
@import '../components/markflow-editor/styles/preview-pane.css';
@import '../components/markflow-editor/styles/preview-content.css';
@import '../components/markflow-editor/styles/codemirror.css';
@import '../components/markflow-editor/styles/settings-modal.css';
```

### 4.3 CSS 타입 선언

TypeScript에서 `.css` import 시 타입 에러가 발생하면, 프로젝트 루트에 선언 파일을 추가합니다:

```typescript
// src/css-modules.d.ts (또는 global.d.ts)
declare module '*.css' {}
```

---

## 5. 기본 사용법

### 5.1 최소 코드 (Uncontrolled)

```tsx
'use client'  // Next.js App Router 필수

import { MarkdownEditor } from '@/components/markflow-editor'

export function BasicEditor() {
  return (
    <MarkdownEditor
      height="600px"
      theme="light"
      layout="split"
    />
  )
}
```

기본 콘텐츠가 자동으로 표시됩니다 (Welcome to MarkFlow Editor).

### 5.2 Controlled 모드

```tsx
'use client'

import { useState } from 'react'
import { MarkdownEditor } from '@/components/markflow-editor'

export function ControlledEditor() {
  const [content, setContent] = useState('# My Document\n\nStart writing...')

  return (
    <MarkdownEditor
      value={content}
      onChange={setContent}
      height="calc(100vh - 64px)"
      theme="dark"
      layout="split"
      placeholder="마크다운을 입력하세요..."
    />
  )
}
```

### 5.3 읽기 전용 모드

```tsx
<MarkdownEditor
  value={documentContent}
  readOnly={true}
  layout="preview"    // 프리뷰만 표시
  theme="light"
/>
```

### 5.4 레이아웃 모드

| 값 | 설명 |
|----|------|
| `'split'` | 에디터 + 프리뷰 좌우 분할 (기본) |
| `'editor'` | 에디터만 전체 화면 |
| `'preview'` | 프리뷰만 전체 화면 |

```tsx
const [layout, setLayout] = useState<EditorLayout>('split')

<MarkdownEditor
  layout={layout}
  // 사용자가 툴바에서 레이아웃을 변경하면 내부 state가 자동 변경됨
  // 외부에서 제어하려면 layout prop을 동적으로 변경
/>
```

---

## 6. Props API 레퍼런스

### 6.1 MarkdownEditorProps

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | — | 마크다운 내용 (controlled 모드) |
| `defaultValue` | `string` | Welcome 텍스트 | 초기값 (uncontrolled 모드) |
| `onChange` | `(value: string) => void` | — | 내용 변경 시 콜백 |
| `layout` | `'split' \| 'editor' \| 'preview'` | `'split'` | 레이아웃 모드 |
| `theme` | `'light' \| 'dark'` | `'light'` | 색상 테마 |
| `height` | `string` | `'600px'` | 에디터 높이 (CSS 값) |
| `placeholder` | `string` | — | 빈 에디터에 표시할 플레이스홀더 |
| `readOnly` | `boolean` | `false` | 읽기 전용 모드 |
| `className` | `string` | `''` | 루트 요소에 추가할 CSS 클래스 |
| `themeVars` | `Record<string, string>` | — | CSS 변수 오버라이드 (`--mf-*`) |
| `onImageUpload` | `(file: File) => Promise<string>` | — | 커스텀 이미지 업로드 핸들러 |
| `onImageUploadGuide` | `() => void` | — | 이미지 업로드 미설정 시 커스텀 안내 |
| `onWikiLinkSearch` | `(query: string) => Promise<WikiLinkItem[]>` | — | `[[` 위키링크 자동완성 검색 |

### 6.2 WikiLinkItem

```typescript
interface WikiLinkItem {
  id: number
  title: string
}
```

### 6.3 ToolbarAction (유틸리티 사용 시)

```typescript
type ToolbarAction =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'strikethrough' }
  | { type: 'code' }
  | { type: 'codeblock'; lang?: string }
  | { type: 'blockquote' }
  | { type: 'ul' }
  | { type: 'ol' }
  | { type: 'task' }
  | { type: 'link' }
  | { type: 'image' }
  | { type: 'table' }
  | { type: 'hr' }
  | { type: 'math-inline' }
  | { type: 'math-block' }
```

---

## 7. 이미지 업로드 연동

에디터는 드래그 앤 드롭, 붙여넣기, 툴바 버튼으로 이미지 업로드를 지원합니다.

### 7.1 커스텀 업로드 API 연동 (권장)

자체 업로드 API가 있다면 `onImageUpload` 콜백을 전달합니다:

```tsx
<MarkdownEditor
  value={content}
  onChange={setContent}
  onImageUpload={async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) throw new Error('Upload failed')

    const { url } = await res.json()
    return url  // 반환된 URL이 ![filename](url) 형태로 삽입됨
  }}
/>
```

**업로드 흐름:**

```
1. 사용자가 이미지 드래그/붙여넣기/버튼 클릭
2. 클라이언트 검증 (타입: png/jpeg/gif/webp/svg, 크기: 최대 10MB)
3. 에디터에 플레이스홀더 삽입: ![Uploading filename...]()
4. onImageUpload(file) 호출 → URL 반환 대기
5. 성공: ![filename](url) 로 교체
6. 실패: 에러 토스트 + 재시도 버튼 표시
```

### 7.2 Cloudflare R2 기본 업로더 사용

`onImageUpload`를 제공하지 않으면 내장 Cloudflare R2 업로더가 활성화됩니다. 사용자가 툴바의 설정(⚙) 버튼에서 Worker URL을 입력할 수 있습니다.

### 7.3 업로드 안내 커스터마이징

업로더가 설정되지 않은 상태에서 이미지 업로드를 시도하면, 기본적으로 ImageUploadGuide 모달이 표시됩니다. 자체 안내 UI를 사용하려면:

```tsx
<MarkdownEditor
  onImageUploadGuide={() => {
    // 커스텀 동작: 설정 페이지 이동, 자체 모달 표시 등
    router.push('/settings/storage')
  }}
/>
```

---

## 8. 위키링크 자동완성 연동

에디터에서 `[[`를 입력하면 문서 검색 자동완성이 활성화됩니다.

```tsx
<MarkdownEditor
  value={content}
  onChange={setContent}
  onWikiLinkSearch={async (query: string): Promise<WikiLinkItem[]> => {
    // API에서 문서 검색
    const res = await fetch(`/api/documents?q=${encodeURIComponent(query)}&limit=8`)
    const { documents } = await res.json()

    return documents.map((doc: { id: number; title: string }) => ({
      id: doc.id,
      title: doc.title,
    }))
  }}
/>
```

**동작 흐름:**

```
1. 사용자가 [[ 입력
2. 이후 타이핑하는 텍스트가 query로 전달
3. onWikiLinkSearch(query) 호출 → WikiLinkItem[] 반환
4. 자동완성 드롭다운에 title 목록 표시
5. 선택 시 [[선택한 제목]] 형태로 삽입
```

---

## 9. 테마 커스터마이징

### 9.1 CSS 변수 오버라이드 (themeVars prop)

`themeVars` prop으로 런타임에 CSS 변수를 오버라이드할 수 있습니다:

```tsx
<MarkdownEditor
  theme="light"
  themeVars={{
    '--mf-accent': '#8b5cf6',             // 보라색 액센트
    '--mf-bg-primary': '#fefce8',         // 연한 노란 배경
    '--mf-color-heading': '#4c1d95',      // 보라색 헤딩
    '--mf-color-link': '#7c3aed',         // 보라색 링크
    '--mf-border-radius': '12px',         // 더 둥근 모서리
  }}
/>
```

### 9.2 전체 CSS 변수 목록

`variables.css`에 정의된 모든 변수 (`--mf-` 네임스페이스):

**레이아웃 (테마 무관)**

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `--mf-border-radius` | `8px` | 모서리 반경 |
| `--mf-toolbar-btn-size` | `28px` | 툴바 버튼 크기 |
| `--mf-line-height` | `1.75` | 줄 높이 |
| `--mf-font-body` | `system-ui, -apple-system, sans-serif` | 본문 폰트 |
| `--mf-font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | 코드 폰트 |

**색상 (라이트 기본값)**

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `--mf-bg-primary` | `#ffffff` | 주 배경색 |
| `--mf-bg-secondary` | `#f9fafb` | 보조 배경색 |
| `--mf-bg-tertiary` | `#f3f4f6` | 3차 배경색 |
| `--mf-text-primary` | `#1f2937` | 주 텍스트색 |
| `--mf-text-secondary` | `#6b7280` | 보조 텍스트색 |
| `--mf-text-muted` | `#9ca3af` | 비활성 텍스트색 |
| `--mf-border-color` | `#e5e7eb` | 테두리색 |
| `--mf-accent` | `#2563eb` | 액센트색 |
| `--mf-accent-light` | `#bfdbfe` | 밝은 액센트색 |
| `--mf-color-heading` | `#111827` | 헤딩 텍스트색 |
| `--mf-color-link` | `#2563eb` | 링크색 |
| `--mf-color-code-bg` | `#f3f4f6` | 인라인 코드 배경 |
| `--mf-color-code-text` | `#7c3aed` | 인라인 코드 텍스트 |
| `--mf-color-blockquote-border` | `#e5e7eb` | 인용문 테두리 |
| `--mf-color-blockquote-text` | `#6b7280` | 인용문 텍스트 |
| `--mf-color-pre-bg` | `#f8fafc` | 코드 블록 배경 |
| `--mf-color-table-header-bg` | `#f3f4f6` | 테이블 헤더 배경 |
| `--mf-color-table-border` | `#e5e7eb` | 테이블 테두리 |

### 9.3 CSS 파일 직접 수정

더 세밀한 커스터마이징이 필요하면 복사한 CSS 파일을 직접 수정합니다:

- `theme-light.css` — 라이트 테마 색상 오버라이드
- `theme-dark.css` — 다크 테마 색상 오버라이드
- `variables.css` — 기본값 변경

> **주의:** 모든 CSS 클래스는 `.mf-` 접두사를 사용하므로 기존 프로젝트 스타일과 충돌하지 않습니다.

---

## 10. 유틸리티 단독 사용

에디터 컴포넌트 없이 유틸리티 함수만 사용할 수 있습니다.

### 10.1 parseMarkdown — 마크다운 → HTML 변환

```tsx
import { parseMarkdown } from '@/components/markflow-editor'

// 프레젠테이션 모드, 미리보기 카드 등에 활용
const html = parseMarkdown('# Hello **World**\n\n$E = mc^2$')

// React에서 렌더링
<div
  className="mf-preview"       // 이 클래스가 있어야 프리뷰 스타일 적용됨
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

**지원하는 마크다운 문법:**
- CommonMark 0.28 (헤딩, 볼드, 이탤릭, 리스트, 코드 블록 등)
- GitHub Flavored Markdown (테이블, 태스크 리스트, 취소선)
- KaTeX 수식 (`$인라인$`, `$$블록$$`)
- 코드 구문 강조 (highlight.js)
- XSS 방어 (rehype-sanitize)

### 10.2 validateImageFile — 이미지 파일 검증

```tsx
import { validateImageFile } from '@/components/markflow-editor'

const result = validateImageFile(file)
if (!result.valid) {
  alert(result.error)  // "지원하지 않는 파일 형식입니다." 등
  return
}
```

**검증 기준:**
- 허용 타입: `png`, `jpeg`, `gif`, `webp`, `svg+xml`
- 최대 크기: 10MB
- 빈 파일 거부

### 10.3 createCloudflareUploader — R2 업로더 팩토리

```tsx
import { createCloudflareUploader } from '@/components/markflow-editor'

const upload = createCloudflareUploader('https://my-worker.workers.dev')
const url = await upload(file)
// Worker에 POST /upload → { success: true, url: "https://..." }
```

### 10.4 applyToolbarAction — CodeMirror 포맷팅

커스텀 툴바를 만들 때 사용합니다:

```tsx
import { applyToolbarAction } from '@/components/markflow-editor'
import type { ToolbarAction } from '@/components/markflow-editor'

// CodeMirror EditorView 인스턴스에 액션 적용
applyToolbarAction(editorView, { type: 'bold' })
applyToolbarAction(editorView, { type: 'heading', level: 2 })
applyToolbarAction(editorView, { type: 'codeblock', lang: 'typescript' })
```

---

## 11. Next.js 연동 가이드

### 11.1 App Router (권장)

```tsx
// app/editor/page.tsx
'use client'  // ← 필수! CodeMirror는 클라이언트에서만 동작

import { useState } from 'react'
import { MarkdownEditor } from '@/components/markflow-editor'

export default function EditorPage() {
  const [content, setContent] = useState('')

  return (
    <div style={{ height: '100vh' }}>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height="100%"
        theme="dark"
        layout="split"
      />
    </div>
  )
}
```

### 11.2 Pages Router

```tsx
// pages/editor.tsx
import dynamic from 'next/dynamic'
import { useState } from 'react'

// SSR 비활성화 — CodeMirror는 window/document 필요
const MarkdownEditor = dynamic(
  () => import('@/components/markflow-editor').then(mod => mod.MarkdownEditor),
  { ssr: false }
)

export default function EditorPage() {
  const [content, setContent] = useState('')

  return (
    <div style={{ height: '100vh' }}>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height="100%"
        theme="light"
      />
    </div>
  )
}
```

### 11.3 next.config.ts 설정

소스 복사 방식에서는 별도 `transpilePackages` 설정이 필요 없습니다. 소스가 프로젝트 내부에 있으므로 자동으로 번들됩니다.

---

## 12. 트러블슈팅

### ReferenceError: document is not defined

**원인:** CodeMirror가 서버 사이드에서 렌더링됨

**해결:**
- App Router: 파일 최상단에 `'use client'` 추가
- Pages Router: `dynamic(() => import(...), { ssr: false })` 사용

### CSS가 적용되지 않음

**확인 사항:**
1. `index.ts`의 CSS side-effect import가 유지되어 있는지 확인
2. `mf-preview` 클래스가 프리뷰 컨테이너에 있는지 확인 (유틸리티 단독 사용 시)
3. CSS 파일 경로가 올바른지 확인

### TypeScript: Cannot find module '*.css'

**해결:** CSS 타입 선언 파일 추가 (4.3절 참고)

```typescript
// src/css-modules.d.ts
declare module '*.css' {}
```

### 에디터 높이가 0px

**원인:** 부모 요소에 높이가 지정되지 않음

**해결:** 부모에 명시적 높이를 지정하거나, `height` prop에 절대값 사용:

```tsx
// ✅ 부모에 높이 지정
<div style={{ height: '100vh' }}>
  <MarkdownEditor height="100%" />
</div>

// ✅ 또는 절대값 사용
<MarkdownEditor height="600px" />
```

### 이미지 업로드 버튼이 보이지 않음

`onImageUpload` 콜백을 전달하지 않고, Cloudflare Worker URL도 설정되지 않은 상태입니다. 다음 중 하나를 수행하세요:

1. `onImageUpload` prop으로 커스텀 업로더 전달
2. 툴바 ⚙ 버튼 → Worker URL 입력

### 프리뷰에서 수식/코드 강조가 표시되지 않음

**확인:** `preview-content.css`에서 KaTeX와 highlight.js CSS를 import하고 있는지 확인:

```css
/* preview-content.css 상단에 있어야 함 */
@import 'katex/dist/katex.min.css';
@import 'highlight.js/styles/github.css';
```

---

## 부록: 마크다운 렌더링 파이프라인

```
Input: markdown (string)
  │
  ├─ remark-parse          → CommonMark AST
  ├─ remark-gfm            → Tables, TaskList, Strikethrough
  ├─ remark-math           → $...$ / $$...$$
  ├─ remark-rehype         → HAST 변환
  ├─ rehype-highlight      → 코드 구문 강조
  ├─ rehype-katex          → 수식 렌더링
  ├─ rehype-raw            → Raw HTML 노드 처리
  ├─ rehype-external-links → target="_blank" 자동 추가
  ├─ rehype-sanitize       → XSS 방어 (필수, 제거 금지!)
  └─ rehype-stringify       → HTML string
  │
Output: safe HTML (string)
```

> **주의:** `rehype-sanitize`는 반드시 `rehype-stringify` 직전에 위치해야 합니다. 이 순서를 변경하면 XSS 취약점이 발생할 수 있습니다.
