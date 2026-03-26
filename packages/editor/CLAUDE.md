# @markflow/editor

독립 배포 가능한 React 마크다운 에디터 컴포넌트.

## 소비자 사용법
```typescript
import { MarkdownEditor } from '@markflow/editor'
import '@markflow/editor/styles'
```

## 빌드
```bash
pnpm build    # tsup → dist/ (ESM + CJS + DTS + CSS)
pnpm dev      # tsup --watch
```

## Public API
- `MarkdownEditor` — 루트 컴포넌트 (controlled/uncontrolled)
- `parseMarkdown(md)` — MD → HTML 변환 유틸리티
- `applyToolbarAction(view, action)` — CodeMirror에 서식 적용
- `createCloudflareUploader(url)` — R2 업로더 팩토리
- `validateImageFile(file)` — 이미지 검증
- 타입: `MarkdownEditorProps`, `EditorLayout`, `EditorTheme`, `ToolbarAction` 등

세부 코딩 규칙은 `.claude/rules/editor.md` 참조.
