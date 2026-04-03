// ─── MarkFlow Editor — Public API ─────────────────────────────────────────────
// 'use client' is injected by tsup banner to support Next.js App Router
// import { MarkdownEditor } from '@markflow/editor'
// import '@markflow/editor/styles'

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

// Side-effect: import all styles into the bundle
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
