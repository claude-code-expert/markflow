// ─── Toolbar Component ────────────────────────────────────────────────────────

import React, { useCallback } from 'react'
import {
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, ListChecks,
  Quote, SquareCode, Minus,
  Link, Image, ImageUp, Table,
  Sigma, SquareSigma,
  Moon, Sun,
  PenLine, Columns2, Eye,
  Settings,
} from 'lucide-react'
import type { ToolbarProps, ToolbarAction } from '../types'

// ─── Button primitives ────────────────────────────────────────────────────────

interface BtnProps {
  title: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}

function Btn({ title, onClick, active, children }: BtnProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`mf-toolbar-btn ${active ? 'mf-toolbar-btn-active' : ''}`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="mf-toolbar-sep" />
}

// Icon size constant for consistency
const ICON_SIZE = 14

// Heading icons array for mapping
const headingIcons = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6] as const

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export function Toolbar({ onAction, layout, onLayoutChange, theme, onThemeChange, onSettingsClick, onImageUploadClick, hasImageUpload }: ToolbarProps) {
  const act = useCallback(
    (action: ToolbarAction) => onAction(action),
    [onAction]
  )

  return (
    <div
      className="mf-toolbar"
      role="toolbar"
      aria-label="Markdown formatting toolbar"
    >
      {/* ── Headings ── */}
      {([1, 2, 3, 4, 5, 6] as const).map((n) => {
        const Icon = headingIcons[n - 1]
        return (
          <Btn key={n} title={`Heading ${n} (Ctrl+Alt+${n})`} onClick={() => act({ type: 'heading', level: n })}>
            <Icon size={ICON_SIZE} />
          </Btn>
        )
      })}

      <Sep />

      {/* ── Inline format ── */}
      <Btn title="Bold (Ctrl+B)" onClick={() => act({ type: 'bold' })}>
        <Bold size={ICON_SIZE} />
      </Btn>
      <Btn title="Italic (Ctrl+I)" onClick={() => act({ type: 'italic' })}>
        <Italic size={ICON_SIZE} />
      </Btn>
      <Btn title="Strikethrough" onClick={() => act({ type: 'strikethrough' })}>
        <Strikethrough size={ICON_SIZE} />
      </Btn>
      <Btn title="Inline code (Ctrl+`)" onClick={() => act({ type: 'code' })}>
        <Code size={ICON_SIZE} />
      </Btn>

      <Sep />

      {/* ── Lists ── */}
      <Btn title="Unordered list" onClick={() => act({ type: 'ul' })}>
        <List size={ICON_SIZE} />
      </Btn>
      <Btn title="Ordered list" onClick={() => act({ type: 'ol' })}>
        <ListOrdered size={ICON_SIZE} />
      </Btn>
      <Btn title="Task list" onClick={() => act({ type: 'task' })}>
        <ListChecks size={ICON_SIZE} />
      </Btn>

      <Sep />

      {/* ── Blocks ── */}
      <Btn title="Blockquote" onClick={() => act({ type: 'blockquote' })}>
        <Quote size={ICON_SIZE} />
      </Btn>
      <Btn title="Code block (Ctrl+Shift+K)" onClick={() => act({ type: 'codeblock' })}>
        <SquareCode size={ICON_SIZE} />
      </Btn>
      <Btn title="Horizontal rule" onClick={() => act({ type: 'hr' })}>
        <Minus size={ICON_SIZE} />
      </Btn>

      <Sep />

      {/* ── Insert ── */}
      <Btn title="Link (Ctrl+K)" onClick={() => act({ type: 'link' })}>
        <Link size={ICON_SIZE} />
      </Btn>
      <Btn title="Image (URL)" onClick={() => act({ type: 'image' })}>
        <Image size={ICON_SIZE} />
      </Btn>
      <Btn title="Upload image" onClick={onImageUploadClick}>
        <ImageUp size={ICON_SIZE} />
      </Btn>
      <Btn title="Table" onClick={() => act({ type: 'table' })}>
        <Table size={ICON_SIZE} />
      </Btn>

      <Sep />

      {/* ── Math ── */}
      <Btn title="Inline math ($...$)" onClick={() => act({ type: 'math-inline' })}>
        <Sigma size={ICON_SIZE} />
      </Btn>
      <Btn title="Math block ($$...$$)" onClick={() => act({ type: 'math-block' })}>
        <SquareSigma size={ICON_SIZE} />
      </Btn>

      {/* ── Spacer + Controls ── */}
      <div className="mf-toolbar-spacer">
        <Sep />

        {/* Settings */}
        <Btn title="Settings" onClick={onSettingsClick}>
          <Settings size={ICON_SIZE} />
        </Btn>

        <Sep />

        {/* Theme toggle */}
        <Btn
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon size={ICON_SIZE} /> : <Sun size={ICON_SIZE} />}
        </Btn>

        <Sep />

        {/* Layout switcher */}
        <Btn title="Editor only" active={layout === 'editor'} onClick={() => onLayoutChange('editor')}>
          <PenLine size={ICON_SIZE} />
        </Btn>
        <Btn title="Split view" active={layout === 'split'} onClick={() => onLayoutChange('split')}>
          <Columns2 size={ICON_SIZE} />
        </Btn>
        <Btn title="Preview only" active={layout === 'preview'} onClick={() => onLayoutChange('preview')}>
          <Eye size={ICON_SIZE} />
        </Btn>
      </div>
    </div>
  )
}
