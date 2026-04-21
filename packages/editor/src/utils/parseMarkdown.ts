// ─── Markdown → HTML Pipeline (remark + rehype) ────────────────────────────────

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { deepmerge } from 'deepmerge-ts'
import type { Root, Element } from 'hast'
import { visit } from 'unist-util-visit'

/** rehype plugin: add target="_blank" and rel="noopener noreferrer" to all <a> links */
function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties) {
        node.properties['target'] = '_blank'
        node.properties['rel'] = 'noopener noreferrer'
      }
    })
  }
}

// Extend sanitize schema to allow code class names (for syntax highlighting)
// and KaTeX-generated classes
const sanitizeSchema = deepmerge(defaultSchema, {
  attributes: {
    code: ['className'],
    span: ['className', 'style', 'aria-hidden'],
    div: ['className', 'style'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['target', 'rel'],
    td: ['align', 'valign'],
    th: ['align', 'valign'],
    details: ['className', 'open'],
    summary: ['className'],
    '*': ['className', 'id'],
  },
  tagNames: [
    // KaTeX MathML
    'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mfrac',
    'msqrt', 'mroot', 'msup', 'msub', 'msubsup', 'annotation',
    'annotation-xml', 'menclose', 'mtext', 'mspace', 'mtable',
    'mtr', 'mtd',
    // GitHub-style HTML elements
    'details', 'summary', 'kbd', 'samp', 'var', 'mark',
    'sup', 'sub', 'abbr', 'ins', 'del',
    'figure', 'figcaption', 'dl', 'dt', 'dd',
    'ruby', 'rt', 'rp',
  ],
} as typeof defaultSchema)

// Singleton processor — built once, reused every render call
const processor = unified()
  .use(remarkParse)                    // CommonMark parsing
  .use(remarkGfm)                      // GitHub Flavored Markdown (tables, task lists, strikethrough)
  .use(remarkBreaks)                   // 단일 개행을 <br>로 변환 (GitHub 코멘트/Notion 스타일)
  .use(remarkMath)                     // $...$ and $$...$$ math blocks
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })  // syntax highlight only when language is specified
  .use(rehypeKatex)                    // render math with KaTeX
  .use(rehypeRaw)                      // raw HTML → proper HAST nodes
  .use(rehypeExternalLinks)            // all links open in new tab
  .use(rehypeSanitize, sanitizeSchema) // XSS protection
  .use(rehypeStringify)

/**
 * Convert markdown string → safe HTML string.
 * Synchronous via processSync — suitable for real-time preview.
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown.trim()) return ''
  try {
    return String(processor.processSync(markdown))
  } catch {
    return '<p style="color:red">⚠ Parse error</p>'
  }
}
