import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { MarkdownSanitizer } from './md-sanitize-extension'
import { FootnoteGuard } from './md-footnote-guard'
import { FootnoteRef } from './md-footnote-ref'
import { WikiLink } from './md-wiki-link'
import { FrontMatter } from './md-front-matter'
import { MathBlock } from './md-math'
import { InlineSyntax, inlineMarkExtensions } from './md-inline-syntax'

// One shared lowlight instance (common language set) for all editors.
const lowlight = createLowlight(common)

/**
 * Semantic extensions shared by the on-screen editor and the headless editor
 * used for markdown <-> HTML conversion. Keeping a single source of truth is
 * what guarantees `markdownToHtml`/`htmlToMarkdown` roundtrips what the user
 * actually edits. UI-only extensions (placeholder, block markers, source node)
 * stay in the renderer.
 */
export function createMarkdownExtensions(): Extensions {
  return [
    // First: sanitize raw HTML from .md files at the DOM boundary before any
    // other parse hook sees it (taskItem.updateDOM, etc.).
    MarkdownSanitizer,
    FootnoteGuard,
    FootnoteRef,
    WikiLink,
    FrontMatter,
    MathBlock,
    // Disable StarterKit's plain codeBlock; CodeBlockLowlight replaces it
    // (same `codeBlock` node name, so tiptap-markdown's spec still applies).
    StarterKit.configure({ codeBlock: false }),
    CodeBlockLowlight.configure({ lowlight }),
    Link.configure({ openOnClick: false }),
    Underline,
    ...inlineMarkExtensions,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table,
    TableRow,
    TableCell,
    TableHeader,
    Image,
    InlineSyntax,
    Markdown.configure({
      html: true,
      linkify: true,
      transformPastedText: true,
      transformCopiedText: true
    })
  ]
}
