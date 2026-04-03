// ─── MarkFlow Editor — Type Definitions ───────────────────────────────────────

export type EditorLayout = 'split' | 'editor' | 'preview'
export type EditorTheme = 'light' | 'dark'

export interface ToolbarItem {
  id: string
  label: string
  icon: string
  shortcut?: string
  action: (view: unknown) => void
  group: 'heading' | 'format' | 'list' | 'block' | 'insert' | 'media'
}

/** Wiki link search result item */
export interface WikiLinkItem {
  id: number
  title: string
}

export interface MarkdownEditorProps {
  /** Current markdown content (controlled) */
  value?: string
  /** Default content (uncontrolled) */
  defaultValue?: string
  /** Called whenever content changes */
  onChange?: (value: string) => void
  /** Editor + preview layout */
  layout?: EditorLayout
  /** Color theme */
  theme?: EditorTheme
  /** Editor height (CSS value, e.g. "600px", "100vh") */
  height?: string
  /** Placeholder shown in empty editor */
  placeholder?: string
  /** Whether editor is read-only */
  readOnly?: boolean
  /** Custom CSS class on the root element */
  className?: string
  /** Custom CSS variables for theme overrides */
  themeVars?: Record<string, string>
  /** Custom image upload handler. If not provided, uses built-in Cloudflare R2 uploader (requires Worker URL via settings). */
  onImageUpload?: (file: File) => Promise<string>
  /** Wiki link search callback. Called when user types [[ to autocomplete document links. */
  onWikiLinkSearch?: (query: string) => Promise<WikiLinkItem[]>
}

export interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  theme: EditorTheme
  placeholder?: string
  readOnly?: boolean
  onScrollRatio?: (ratio: number) => void
  scrollRatio?: number
  /** Called when an image file is dropped or pasted into the CodeMirror editor */
  onImageFile?: (file: File) => void
  /** Wiki link search callback for [[ autocomplete */
  onWikiLinkSearch?: (query: string) => Promise<WikiLinkItem[]>
}

export interface PreviewPaneProps {
  markdown: string
  theme: EditorTheme
  scrollRatio?: number
  onScrollRatio?: (ratio: number) => void
}

export interface PreviewPaneHandle {
  scrollToHeading: (headingText: string) => void
}

export interface ToolbarProps {
  onAction: (action: ToolbarAction) => void
  layout: EditorLayout
  onLayoutChange: (layout: EditorLayout) => void
  theme: EditorTheme
  onThemeChange: (theme: EditorTheme) => void
  onSettingsClick: () => void
  onImageUploadClick: () => void
  hasImageUpload: boolean
}

export type ToolbarAction =
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
