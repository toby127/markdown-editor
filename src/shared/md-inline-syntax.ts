import { Extension, type Extensions } from '@tiptap/core'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Highlight from '@tiptap/extension-highlight'
import mdMark from 'markdown-it-mark'
import mdSup from 'markdown-it-sup'
import mdSub from 'markdown-it-sub'

/**
 * Inline Markdown syntax beyond CommonMark: ==highlight==, ^sup^, ~sub~.
 *
 * Two halves must be wired for each syntax (the "four points" from the
 * comparison doc):
 *   1. parse  — markdown-it plugins turn `^x^`/`~x~`/`==x==` into <sup>/<sub>/<mark>
 *              HTML, which the TipTap mark extensions' parseHTML recognizes.
 *   2. serialize — each mark needs a markdown serialize spec, otherwise
 *              tiptap-markdown falls back to emitting raw HTML tags. We emit
 *              the canonical `^`/`~`/`==` delimiters instead.
 *
 * We keep these extensions here rather than inline in createMarkdownExtensions
 * so the parse plugins and their serialize specs stay in one place.
 */

type MdWithUse = {
  use: (plugin: unknown) => unknown
}

/** Registers markdown-it plugins on the parser instance. */
export const InlineSyntax = Extension.create({
  name: 'inlineSyntax',
  addStorage() {
    return {
      markdown: {
        parse: {
          setup(md: MdWithUse) {
            // Order matters only for overlapping delimiters; these are distinct.
            md.use(mdMark)
            md.use(mdSup)
            md.use(mdSub)
          }
        }
      }
    }
  }
})

/** Serialize specs that emit canonical Markdown instead of raw HTML tags. */
const delimited = (open: string, close: string) => ({
  open: () => open,
  close: () => close
})

export const SuperscriptMarkdown = Superscript.extend({
  addStorage() {
    return { markdown: { serialize: delimited('^', '^') } }
  }
})

export const SubscriptMarkdown = Subscript.extend({
  addStorage() {
    return { markdown: { serialize: delimited('~', '~') } }
  }
})

export const HighlightMarkdown = Highlight.extend({
  addStorage() {
    return { markdown: { serialize: delimited('==', '==') } }
  }
})

/**
 * Semantic inline extensions to spread into the editor extension list.
 * Replaces the plain Superscript/Subscript/Highlight entries.
 */
export const inlineMarkExtensions: Extensions = [
  SuperscriptMarkdown,
  SubscriptMarkdown,
  HighlightMarkdown
]
