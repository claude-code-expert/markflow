// ─── EditorPane — CodeMirror 6 source editor ─────────────────────────────────

import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { EditorPaneProps, WikiLinkItem } from '../types'

// Compartments allow hot-swapping extensions without full rebuild
const themeCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const placeholderCompartment = new Compartment()

// ─── Light highlight style ───────────────────────────────────────────────────
// Mirrors the same token coverage as oneDark but with light-appropriate colors.

const lightHighlightStyle = HighlightStyle.define([
  // ── Markdown structure ──
  { tag: tags.heading1, color: '#1e3a8a', fontWeight: 'bold', fontSize: '1.4em' },
  { tag: tags.heading2, color: '#1e40af', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: tags.heading3, color: '#2563eb', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: tags.heading, color: '#1e40af', fontWeight: 'bold' },
  { tag: tags.strong, color: '#b91c1c', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#0d9488', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: '#9ca3af', textDecoration: 'line-through' },
  { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
  { tag: tags.url, color: '#7c3aed' },
  { tag: tags.monospace, color: '#7c3aed', backgroundColor: '#f5f3ff' },
  { tag: tags.quote, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.list, color: '#d97706' },
  { tag: tags.contentSeparator, color: '#d1d5db' },

  // ── Markdown meta (# markers, ``` fences, ** wrappers, etc.) ──
  { tag: tags.processingInstruction, color: '#9ca3af' },
  { tag: tags.meta, color: '#9ca3af' },
  { tag: tags.labelName, color: '#2563eb' },

  // ── Code block syntax (fenced code language tokens) ──
  { tag: tags.keyword, color: '#7c3aed' },
  { tag: tags.controlKeyword, color: '#7c3aed', fontWeight: '600' },
  { tag: tags.moduleKeyword, color: '#7c3aed' },
  { tag: tags.operatorKeyword, color: '#7c3aed' },
  { tag: tags.string, color: '#059669' },
  { tag: tags.number, color: '#d97706' },
  { tag: tags.bool, color: '#d97706' },
  { tag: tags.null, color: '#d97706' },
  { tag: tags.comment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#0284c7' },
  { tag: tags.definition(tags.variableName), color: '#1d4ed8' },
  { tag: tags.typeName, color: '#0d9488' },
  { tag: tags.className, color: '#b45309' },
  { tag: tags.propertyName, color: '#b91c1c' },
  { tag: tags.definition(tags.propertyName), color: '#b91c1c' },
  { tag: tags.function(tags.variableName), color: '#1d4ed8' },
  { tag: tags.operator, color: '#6b7280' },
  { tag: tags.punctuation, color: '#6b7280' },
  { tag: tags.bracket, color: '#6b7280' },
  { tag: tags.angleBracket, color: '#6b7280' },
  { tag: tags.squareBracket, color: '#6b7280' },
  { tag: tags.paren, color: '#6b7280' },
  { tag: tags.brace, color: '#6b7280' },
  { tag: tags.regexp, color: '#b91c1c' },
  { tag: tags.tagName, color: '#b91c1c' },
  { tag: tags.attributeName, color: '#d97706' },
  { tag: tags.attributeValue, color: '#059669' },
  { tag: tags.atom, color: '#d97706' },
  { tag: tags.self, color: '#7c3aed' },
  { tag: tags.special(tags.variableName), color: '#b45309' },
])

// ─── Light editor theme (layout/chrome) ──────────────────────────────────────

const lightEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      height: '100%',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: '13px',
    },
    '.cm-content': { padding: '12px 16px', caretColor: '#2563eb' },
    '.cm-line': { padding: '0' },
    '.cm-cursor': { borderLeftColor: '#2563eb' },
    '.cm-selectionBackground, ::selection': { backgroundColor: '#bfdbfe' },
    '.cm-gutters': {
      backgroundColor: '#f9fafb',
      color: '#9ca3af',
      borderRight: '1px solid #e5e7eb',
    },
    '.cm-activeLine': { backgroundColor: '#f0f9ff' },
    '.cm-activeLineGutter': { backgroundColor: '#e0f2fe' },
    '.cm-placeholder': { color: '#9ca3af' },
  },
  { dark: false }
)

// Combined light theme: editor chrome + syntax highlighting
const lightTheme = [lightEditorTheme, syntaxHighlighting(lightHighlightStyle)]

// ─── Wiki link [[completion source ────────────────────────────────────────────

function createWikiLinkCompletion(
  searchFn: (query: string) => Promise<WikiLinkItem[]>
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const line = context.state.doc.lineAt(context.pos)
    const textBefore = line.text.slice(0, context.pos - line.from)
    const match = /\[\[([^\]]*)$/.exec(textBefore)
    if (!match) return null

    const query = match[1] ?? ''
    const from = context.pos - query.length

    const items = await searchFn(query)
    if (items.length === 0) return null

    return {
      from,
      options: items.map((item) => ({
        label: item.title || `문서 #${item.id}`,
        apply: `${item.title || `문서 #${item.id}`}]]`,
      })),
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const EditorPane = React.forwardRef<EditorView | null, EditorPaneProps>(
  function EditorPane(
    { value, onChange, theme, placeholder, readOnly = false, onScrollRatio, onImageFile, onWikiLinkSearch },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const isExternalUpdate = useRef(false)

    const setRef = useCallback(
      (view: EditorView | null) => {
        viewRef.current = view
        if (typeof ref === 'function') ref(view)
        else if (ref) ref.current = view
      },
      [ref]
    )

    // ── Initialise editor once ──────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return

      const view = new EditorView({
        state: EditorState.create({
          doc: value ?? '',
          extensions: [
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            EditorView.lineWrapping,
            themeCompartment.of(theme === 'dark' ? oneDark : lightTheme),
            readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
            placeholderCompartment.of(
              placeholderExt(placeholder ?? 'Start writing Markdown…')
            ),
            ...(onWikiLinkSearch
              ? [autocompletion({
                  override: [createWikiLinkCompletion(onWikiLinkSearch)],
                  activateOnTyping: true,
                })]
              : []),
            EditorView.updateListener.of((update) => {
              if (update.docChanged && !isExternalUpdate.current) {
                onChange(update.state.doc.toString())
              }
            }),
            EditorView.domEventHandlers({
              mouseup(_event, view) {
                // 클릭 시 커서 위치 기반으로 프리뷰 동기화 트리거
                const el = view.scrollDOM
                const ratio =
                  el.scrollHeight === el.clientHeight
                    ? 0
                    : el.scrollTop / (el.scrollHeight - el.clientHeight)
                onScrollRatio?.(ratio)
                return false
              },
              drop(event) {
                const files = event.dataTransfer?.files
                if (!files) return false
                const imageFile = Array.from(files).find((f) =>
                  f.type.startsWith('image/')
                )
                if (imageFile) {
                  event.preventDefault()
                  onImageFile?.(imageFile)
                  return true
                }
                return false
              },
              paste(event) {
                const items = event.clipboardData?.items
                if (!items) return false
                const imageItem = Array.from(items).find((item) =>
                  item.type.startsWith('image/')
                )
                if (imageItem) {
                  const file = imageItem.getAsFile()
                  if (file) {
                    event.preventDefault()
                    onImageFile?.(file)
                    return true
                  }
                }
                return false
              },
            }),
          ],
        }),
        parent: containerRef.current,
      })

      setRef(view)
      return () => {
        view.destroy()
        setRef(null)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current === value) return
      isExternalUpdate.current = true
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value ?? '' },
      })
      isExternalUpdate.current = false
    }, [value])

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : lightTheme),
      })
    }, [theme])

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
      })
    }, [readOnly])

    return (
      <div
        ref={containerRef}
        className="mf-editor-container"
        aria-label="Markdown source editor"
      />
    )
  }
)

EditorPane.displayName = 'EditorPane'
