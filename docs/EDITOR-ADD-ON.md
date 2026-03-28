# @markflow/editor — 독립 에디터 설치 가이드

> 어떤 React 18+ 프로젝트에든 2줄로 마크다운 에디터를 추가할 수 있습니다.
> 백엔드/API 없이 완전히 클라이언트 사이드로 동작합니다.

---

## Quick Start

```bash
npm install @markflow/editor
# or
pnpm add @markflow/editor
# or
yarn add @markflow/editor
```

```tsx
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

export function MyPage() {
  return <MarkdownEditor height="100vh" theme="light" />
}
```

이게 전부입니다. 에디터가 즉시 동작합니다.

---

## 요구사항

| 항목 | 버전 |
|------|------|
| React | 18.0+ 또는 19.0+ |
| React DOM | 18.0+ 또는 19.0+ |
| 번들러 | CSS import 지원 (Next.js, Vite, Webpack 등) |

> CodeMirror 6, unified/remark/rehype, KaTeX 등 모든 의존성은 패키지 내부에 포함됩니다.
> 소비자가 별도로 설치할 것은 React뿐입니다.

---

## Props 전체 목록

```typescript
interface MarkdownEditorProps {
  value?: string              // controlled 모드 (외부에서 상태 관리)
  defaultValue?: string       // uncontrolled 모드 초기값
  onChange?: (value: string) => void  // 내용 변경 콜백
  layout?: 'split' | 'editor' | 'preview'  // 기본값: 'split'
  theme?: 'light' | 'dark'   // 기본값: 'light'
  height?: string             // CSS 값, 기본값: '600px'
  placeholder?: string        // 빈 에디터 안내 텍스트
  readOnly?: boolean          // 읽기 전용 모드, 기본값: false
  className?: string          // 루트 div에 추가 CSS 클래스
  themeVars?: Record<string, string>  // --mf-* CSS 변수 오버라이드
  onImageUpload?: (file: File) => Promise<string>  // 커스텀 이미지 업로드
}
```

---

## 사용 패턴

### 1. Uncontrolled (가장 간단)

```tsx
<MarkdownEditor
  defaultValue="# Hello World"
  height="500px"
/>
```

에디터 내부에서 상태를 관리합니다. 초기값만 전달하면 됩니다.

### 2. Controlled (외부 상태 관리)

```tsx
import { useState } from 'react'
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

export function Editor() {
  const [content, setContent] = useState('# My Document')

  const handleSave = async () => {
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  }

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height="calc(100vh - 60px)"
      />
    </div>
  )
}
```

> **참고**: `onSave` prop은 없습니다. 저장 로직은 `onChange`로 받은 값을 소비자가 직접 구현합니다.

### 3. 읽기 전용 뷰어

```tsx
<MarkdownEditor
  value={markdownContent}
  readOnly
  layout="preview"
  height="auto"
/>
```

### 4. 다크 테마 + 커스텀 CSS 변수

```tsx
<MarkdownEditor
  theme="dark"
  themeVars={{
    '--mf-font-body': '"Pretendard", sans-serif',
    '--mf-color-heading': '#e2e8f0',
    '--mf-max-width': '800px',
  }}
  height="100vh"
/>
```

### 5. 커스텀 이미지 업로드

```tsx
async function uploadToS3(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const { url } = await res.json()
  return url  // 반환된 URL이 마크다운에 삽입됨
}

<MarkdownEditor
  onImageUpload={uploadToS3}
  height="600px"
/>
```

이미지 업로드 동작:
1. `onImageUpload` prop 제공 → 해당 함수 사용
2. prop 없고 설정 모달에서 Worker URL 입력 → 내장 Cloudflare R2 업로더 사용
3. 둘 다 없음 → 이미지 업로드 안내 모달 표시

---

## 프레임워크별 설정

### Next.js (App Router)

```tsx
// app/editor/page.tsx
// 'use client' 래퍼 불필요 — tsup 빌드 시 자동 주입됨
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

export default function EditorPage() {
  return <MarkdownEditor height="calc(100vh - 64px)" />
}
```

### Next.js (Pages Router)

```tsx
// pages/editor.tsx
import dynamic from 'next/dynamic'

const MarkdownEditor = dynamic(
  () => import('@markflow/editor').then(m => m.MarkdownEditor),
  { ssr: false }
)
import '@markflow/editor/styles'

export default function EditorPage() {
  return <MarkdownEditor height="calc(100vh - 64px)" />
}
```

> Pages Router에서는 CodeMirror가 `document`에 접근하므로 `ssr: false`가 필요합니다.

### Vite + React

```tsx
// src/App.tsx
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

function App() {
  return <MarkdownEditor height="100vh" theme="dark" />
}
```

추가 설정 불필요. Vite가 CSS import를 자동 처리합니다.

### Create React App

```tsx
// src/App.tsx
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'

function App() {
  return <MarkdownEditor height="calc(100vh - 40px)" />
}
```

---

## 유틸리티 함수

에디터 컴포넌트 외에도 마크다운 변환 유틸리티를 독립적으로 사용할 수 있습니다:

### parseMarkdown — MD를 안전한 HTML로 변환

```typescript
import { parseMarkdown } from '@markflow/editor'

const html = parseMarkdown('# Hello **World**')
// → '<h1>Hello <strong>World</strong></h1>'
```

- 동기 함수 (`processSync`) — 실시간 프리뷰에 적합
- CommonMark 0.28 + GFM (테이블, 태스크 리스트, 취소선)
- KaTeX 수식 (`$inline$`, `$$block$$`)
- 코드 구문 강조 (rehype-highlight)
- **XSS 보호** (rehype-sanitize) — `<script>`, `on*` 이벤트, `javascript:` URL 자동 제거

### applyToolbarAction — 에디터에 서식 적용

```typescript
import { applyToolbarAction } from '@markflow/editor'

// CodeMirror EditorView 인스턴스에 직접 서식 적용
applyToolbarAction(editorView, { type: 'bold' })
applyToolbarAction(editorView, { type: 'heading', level: 2 })
applyToolbarAction(editorView, { type: 'codeblock', lang: 'typescript' })
```

### validateImageFile — 이미지 파일 검증

```typescript
import { validateImageFile } from '@markflow/editor'

const result = validateImageFile(file)
// { valid: true } 또는 { valid: false, error: '파일 크기 초과 (최대 10MB)' }
```

허용: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml` (최대 10MB)

---

## 지원하는 마크다운 문법

| 문법 | 예시 | 키보드 단축키 |
|------|------|-------------|
| 제목 H1~H6 | `# ~ ######` | Ctrl+Alt+1~6 |
| **볼드** | `**text**` | Ctrl+B |
| *이탤릭* | `*text*` | Ctrl+I |
| ~~취소선~~ | `~~text~~` | - |
| `인라인 코드` | `` `code` `` | Ctrl+` |
| 코드 블록 | ` ```lang ``` ` | Ctrl+Shift+K |
| 링크 | `[text](url)` | Ctrl+K |
| 이미지 | `![alt](url)` | - |
| 순서 없는 목록 | `- item` | - |
| 순서 있는 목록 | `1. item` | - |
| 태스크 리스트 | `- [ ] task` | - |
| 인용문 | `> text` | - |
| 테이블 | GFM 테이블 | - |
| 수평선 | `---` | - |
| 인라인 수식 | `$E=mc^2$` | - |
| 블록 수식 | `$$\int_0^1$$` | - |

---

## CSS 커스터마이징

모든 스타일은 `--mf-*` CSS 변수로 제어됩니다:

```css
/* 프로젝트 CSS에서 오버라이드 */
.mf-editor-root {
  --mf-font-body: 'Noto Sans KR', sans-serif;
  --mf-font-code: 'Fira Code', monospace;
  --mf-font-heading: 'Sora', sans-serif;
  --mf-color-heading: #1a1a2e;
  --mf-color-body: #374151;
  --mf-color-link: #2563eb;
  --mf-color-code-bg: #f3f4f6;
  --mf-line-height: 1.75;
  --mf-max-width: 720px;
}
```

또는 `themeVars` prop으로 인라인 전달:

```tsx
<MarkdownEditor themeVars={{ '--mf-font-body': 'Georgia, serif' }} />
```

> 모든 CSS 클래스는 `.mf-` 접두사를 사용하므로 호스트 프로젝트 스타일과 충돌하지 않습니다.

---

## 빌드 출력물

```
dist/
├── index.js       (ESM, 50KB)
├── index.cjs      (CJS, 50KB)
├── index.d.ts     (ESM 타입 선언)
├── index.d.cts    (CJS 타입 선언)
├── index.css      (모든 스타일 번들, 18KB)
├── index.js.map
├── index.cjs.map
└── index.css.map
```

- ESM + CJS 동시 지원
- TypeScript 타입 선언 포함
- 소스맵 포함
- 트리쉐이킹 지원

---

## 알려진 주의사항

1. **`defaultValue` 미지정 시 샘플 콘텐츠 표시**: 빈 에디터를 원하면 `defaultValue=""` 또는 `value=""`를 명시하세요.

2. **SSR 환경**: CodeMirror가 `document` 객체에 접근하므로, Pages Router(Next.js)에서는 `dynamic(() => import(...), { ssr: false })`가 필요합니다. App Router에서는 `'use client'`가 자동 적용되어 별도 처리 불필요합니다.

3. **이미지 업로드**: `onImageUpload` prop 없이 사용하면 설정 모달에서 Cloudflare Worker URL을 입력해야 합니다. 자체 업로드 서버가 있다면 `onImageUpload`를 사용하세요.

4. **npm 배포**: 현재 `package.json`에 `"private": true`가 설정되어 있어 `npm publish`가 차단됩니다. 배포 시 제거 필요합니다.

---

## 테스트 현황

```
packages/editor/src/utils/__tests__/markdownActions.test.ts
  28 tests passed (206ms)

  Headings H1-H6: 6/6
  Bold: 2/2, Italic: 1/1, Strikethrough: 3/3
  Inline Code: 1/1, Code Block: 2/2
  Lists (UL/OL/Task): 3/3
  Blockquote: 1/1, HR: 1/1
  Link: 1/1, Image: 1/1, Table: 1/1
  Math (Inline/Block): 2/2
  복합 렌더링: 2/2
  통합 테스트 (22개 액션): 1/1
```

---

## 라이선스

이 패키지의 라이선스는 프로젝트 루트의 LICENSE 파일을 참조하세요.
