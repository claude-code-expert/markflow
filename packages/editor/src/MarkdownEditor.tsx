// ─── MarkdownEditor — Root Component ─────────────────────────────────────────

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { PenLine, Eye, Loader2, X, RotateCcw } from 'lucide-react'
import { Toolbar } from './toolbar/Toolbar'
import { EditorPane } from './editor/EditorPane'
import { PreviewPane } from './preview/PreviewPane'
import { SettingsModal, getSavedWorkerUrl } from './toolbar/SettingsModal'
import { ImageUploadGuide } from './toolbar/ImageUploadGuide'
import { applyToolbarAction } from './utils/markdownActions'
import { countWords } from './utils/wordCount'
import { createCloudflareUploader } from './utils/cloudflareUploader'
import { validateImageFile } from './utils/imageValidation'
import type { MarkdownEditorProps, EditorLayout, EditorTheme, ToolbarAction, PreviewPaneHandle } from './types'

const DEFAULT_CONTENT = `# Welcome to MarkFlow Editor

Write **Markdown** here and see a live preview on the right.

## Features

- CommonMark 0.28 + GFM (tables, task lists, strikethrough)
- Syntax-highlighted code blocks
- Math with KaTeX: $E = mc^2$
- Mermaid diagrams *(coming soon)*

## Code example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

## Table

| Feature | Status |
| --- | --- |
| Dual view | ✅ |
| Toolbar | ✅ |
| Scroll sync | ✅ |

> **Tip:** Use the toolbar above or keyboard shortcuts to format text.

---

[MarkFlow Docs](https://markflow.io)
`

// ─── Image upload helper ─────────────────────────────────────────────────────

function insertTextAtCursor(view: EditorView, text: string): { from: number; to: number } {
  const main = view.state.selection.main
  const from = main.from
  view.dispatch(
    view.state.update({
      changes: { from: main.from, to: main.to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
      scrollIntoView: true,
      userEvent: 'input',
    })
  )
  return { from, to: from + text.length }
}

function replaceRange(view: EditorView, from: number, to: number, text: string): void {
  view.dispatch(
    view.state.update({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
      scrollIntoView: true,
      userEvent: 'input',
    })
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarkdownEditor({
  value,
  defaultValue,
  onChange,
  layout: layoutProp = 'split',
  theme: themeProp = 'light',
  height = '600px',
  placeholder,
  readOnly = false,
  className = '',
  themeVars,
  onImageUpload: onImageUploadProp,
  onWikiLinkSearch,
}: MarkdownEditorProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? DEFAULT_CONTENT
  )
  const [layout, setLayout] = useState<EditorLayout>(layoutProp)
  const [theme, setTheme] = useState<EditorTheme>(themeProp)

  // Sync layout/theme props to internal state
  useEffect(() => { setLayout(layoutProp) }, [layoutProp])
  useEffect(() => { setTheme(themeProp) }, [themeProp])
  const [editorScrollRatio, setEditorScrollRatio] = useState<number>(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [workerUrl, setWorkerUrl] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadState, setUploadState] = useState<{
    status: 'idle' | 'uploading' | 'error'
    fileName?: string
    error?: string
    retryFile?: File
  }>({ status: 'idle' })

  // Hidden file input ref for image upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Cursor position tracking
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)

  // Load saved Cloudflare Worker URL on mount
  useEffect(() => {
    setWorkerUrl(getSavedWorkerUrl())
  }, [])

  // Controlled vs uncontrolled
  const isControlled = value !== undefined
  const markdown = isControlled ? (value ?? '') : internalValue

  // Ref to CodeMirror EditorView
  const editorViewRef = useRef<EditorView | null>(null)
  // Ref to PreviewPane for heading-based scroll sync
  const previewRef = useRef<PreviewPaneHandle | null>(null)
  const lastHeadingRef = useRef<string | null>(null)

  // Resolve image upload function
  const resolveUploader = useCallback((): ((file: File) => Promise<string>) | null => {
    if (onImageUploadProp) return onImageUploadProp
    if (workerUrl) return createCloudflareUploader(workerUrl)
    return null
  }, [onImageUploadProp, workerUrl])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (newValue: string) => {
      if (!isControlled) setInternalValue(newValue)
      onChange?.(newValue)
      // Update cursor position
      const view = editorViewRef.current
      if (view) {
        const pos = view.state.selection.main.head
        const line = view.state.doc.lineAt(pos)
        setCursorLine(line.number)
        setCursorCol(pos - line.from + 1)
      }
    },
    [isControlled, onChange]
  )

  const handleToolbarAction = useCallback((action: ToolbarAction) => {
    if (!editorViewRef.current) return
    applyToolbarAction(editorViewRef.current, action)
  }, [])

  const handleEditorCursorSync = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return

    // 커서 위치에서 가장 가까운 헤딩을 역방향 탐색
    const cursorPos = view.state.selection.main.head
    const doc = view.state.doc
    let foundHeading: string | null = null

    for (let pos = cursorPos; pos >= 0; ) {
      const line = doc.lineAt(pos)
      const match = /^#{1,6}\s+(.+)/.exec(line.text)
      if (match?.[1]) {
        foundHeading = match[1].trim()
        break
      }
      if (line.number <= 1) break
      pos = doc.line(line.number - 1).from
    }

    if (foundHeading && foundHeading !== lastHeadingRef.current) {
      lastHeadingRef.current = foundHeading
      previewRef.current?.scrollToHeading(foundHeading)
    }
  }, [])

  const handlePreviewScroll = useCallback((ratio: number) => {
    setEditorScrollRatio(ratio)
  }, [])

  // ── Image upload ────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    const view = editorViewRef.current
    if (!view) return

    const uploader = resolveUploader()
    if (!uploader) {
      setGuideOpen(true)
      return
    }

    // Client-side validation
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadState({ status: 'error', fileName: file.name, error: validation.error, retryFile: undefined })
      return
    }

    // Insert placeholder & show uploading state
    const placeholderText = `![Uploading ${file.name}...]()`
    const { from, to } = insertTextAtCursor(view, placeholderText)
    setUploadState({ status: 'uploading', fileName: file.name })

    try {
      const url = await uploader(file)
      const imageMarkdown = `![${file.name}](${url})`
      replaceRange(view, from, to, imageMarkdown)
      setUploadState({ status: 'idle' })
    } catch (err) {
      const errorText = `![Upload failed: ${file.name}]()`
      replaceRange(view, from, to, errorText)
      const errorMsg = err instanceof Error ? err.message : 'Upload failed'
      setUploadState({ status: 'error', fileName: file.name, error: errorMsg, retryFile: file })
      console.error('Image upload failed:', err)
    }
  }, [resolveUploader])

  const handleRetryUpload = useCallback(() => {
    if (uploadState.retryFile) {
      handleImageUpload(uploadState.retryFile)
    }
  }, [uploadState.retryFile, handleImageUpload])

  const dismissUploadState = useCallback(() => {
    setUploadState({ status: 'idle' })
  }, [])

  const handleImageUploadClick = useCallback(() => {
    const uploader = resolveUploader()
    if (!uploader) {
      setGuideOpen(true)
      return
    }
    fileInputRef.current?.click()
  }, [resolveUploader])

  const handleGuideGoToSettings = useCallback(() => {
    setGuideOpen(false)
    setSettingsOpen(true)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleImageUpload])

  // ── Drag & Drop on editor ───────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    dragCounterRef.current = 0
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(f => f.type.startsWith('image/'))
    if (imageFile) {
      e.preventDefault()
      handleImageUpload(imageFile)
    }
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
    }
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      dragCounterRef.current += 1
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  // ── Paste image ─────────────────────────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (imageItem) {
      const file = imageItem.getAsFile()
      if (file) {
        e.preventDefault()
        handleImageUpload(file)
      }
    }
  }, [handleImageUpload])

  // ── Settings ────────────────────────────────────────────────────────────
  const handleSettingsSave = useCallback((url: string) => {
    setWorkerUrl(url)
  }, [])

  // ── Layout visibility ─────────────────────────────────────────────────────
  const showEditor = layout === 'split' || layout === 'editor'
  const showPreview = layout === 'split' || layout === 'preview'

  const hasImageUpload = !!onImageUploadProp || !!workerUrl

  // ── Root style (height only — themeVars applied to preview pane only) ─────
  const rootStyle: React.CSSProperties = {
    height,
  }

  // ── Custom theme variables for preview pane only ────────────────────────
  const previewThemeStyle: React.CSSProperties = themeVars
    ? { ...themeVars as React.CSSProperties }
    : {}

  return (
    <div
      className={`mf-root mf-editor-root ${isDragOver ? 'mf-drag-over' : ''} ${className}`}
      data-theme={theme}
      style={rootStyle}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* ── Toolbar ── */}
      <Toolbar
        onAction={handleToolbarAction}
        layout={layout}
        onLayoutChange={setLayout}
        theme={theme}
        onThemeChange={setTheme}
        onSettingsClick={() => setSettingsOpen(true)}
        onImageUploadClick={handleImageUploadClick}
        hasImageUpload={hasImageUpload}
      />

      {/* ── Image Upload Guide Modal ── */}
      <ImageUploadGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onGoToSettings={handleGuideGoToSettings}
      />

      {/* ── Settings Modal ── */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {/* ── Panes ── */}
      <div className="mf-panes-container">
        {/* Editor pane */}
        {showEditor && (
          <div
            className={[
              'mf-pane-wrapper',
              showPreview ? 'mf-pane-half' : 'mf-pane-full',
              showPreview ? 'mf-pane-border-right' : '',
            ].join(' ')}
          >
            <div className="mf-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PenLine size={10} />
                Editor
              </span>
            </div>
            <div className="mf-pane-content">
              <EditorPane
                ref={editorViewRef}
                value={markdown}
                onChange={handleChange}
                theme={theme}
                placeholder={placeholder}
                readOnly={readOnly}
                onScrollRatio={handleEditorCursorSync}
                scrollRatio={editorScrollRatio}
                onImageFile={handleImageUpload}
                onWikiLinkSearch={onWikiLinkSearch}
              />
            </div>
          </div>
        )}

        {/* Preview pane */}
        {showPreview && (
          <div
            className={[
              'mf-pane-wrapper',
              showEditor ? 'mf-pane-half' : 'mf-pane-full',
            ].join(' ')}
          >
            <div className="mf-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={10} />
                Preview
              </span>
              <span style={{ fontWeight: 400, color: 'var(--mf-text-3, #9A9890)', fontSize: '11px' }}>
                {countWords(markdown)} words
              </span>
            </div>
            <div className="mf-pane-content" style={previewThemeStyle}>
              <PreviewPane
                ref={previewRef}
                markdown={markdown}
                theme={theme}
                onScrollRatio={handlePreviewScroll}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Drag overlay ── */}
      {isDragOver && (
        <div className="mf-drag-overlay">
          <div className="mf-drag-overlay-content">
            <span className="mf-drag-overlay-icon">📷</span>
            <span>이미지를 놓으세요</span>
          </div>
        </div>
      )}

      {/* ── Upload status toast ── */}
      {uploadState.status === 'uploading' && (
        <div className="mf-upload-toast mf-upload-toast-uploading">
          <Loader2 size={14} className="mf-upload-spinner" />
          <span>업로드 중: {uploadState.fileName}</span>
        </div>
      )}
      {uploadState.status === 'error' && (
        <div className="mf-upload-toast mf-upload-toast-error">
          <span className="mf-upload-toast-msg">❌ {uploadState.error}</span>
          <div className="mf-upload-toast-actions">
            {uploadState.retryFile && (
              <button className="mf-upload-toast-btn" onClick={handleRetryUpload} title="재시도">
                <RotateCcw size={12} />
                재시도
              </button>
            )}
            <button className="mf-upload-toast-btn" onClick={dismissUploadState} title="닫기">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Status bar ── */}
      <div className="mf-statusbar">
        <span>
          {markdown.split('\n').length} lines · {markdown.length} chars
        </span>
        <span className="mf-statusbar-right">
          {readOnly && <span className="mf-readonly-badge">READ ONLY</span>}
        </span>
      </div>
    </div>
  )
}
