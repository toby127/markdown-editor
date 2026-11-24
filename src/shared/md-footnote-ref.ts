import { Node, mergeAttributes } from '@tiptap/core'

/**
 * GFM footnote reference `[^label]` as a real inline atom.
 *
 * Why an atom instead of plain text: tiptap-markdown escapes Markdown
 * punctuation in text nodes, so a literal `[^1]` would roundtrip as
 * `\[^1\]` — visually the same, but no longer a footnote for any other
 * Markdown tool. Owning the node lets us emit the canonical syntax.
 *
 * Definition lines (`[^1]: note`) are handled by FootnoteGuard, which stops
 * markdown-it from consuming them as link references. They stay as ordinary
 * paragraph text; this inline rule matches the leading `[^1]` and the rest
 * (`: note`) remains a text node. On serialize the two halves join back into
 * the original definition line.
 */

type InlineState = {
  src: string
  pos: number
  push: (type: string, tag: string, nesting: number) => { content: string }
}

type MdWithFootnoteRule = {
  /** Per-parser marker: extension instances are reused across editors. */
  __footnoteRefRegistered?: boolean
  inline: {
    ruler: {
      before: (before: string, name: string, fn: unknown) => void
    }
  }
  renderer: {
    rules: Record<string, (tokens: Array<{ content: string }>, idx: number) => string>
  }
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** markdown-it inline rule for `[^label]`. */
function footnoteRefRule(state: InlineState, silent: boolean): boolean {
  const { src, pos } = state
  if (src[pos] !== '[' || src[pos + 1] !== '^') return false
  const end = src.indexOf(']', pos + 2)
  if (end < 0) return false
  const label = src.slice(pos + 2, end)
  if (label === '' || /[\s\[\]]/.test(label)) return false
  // markdown-it rules MUST advance state.pos even in silent/validation mode.
  // A parent inline rule (e.g. markdown-it-sup scanning ^...^) calls skipToken
  // over this content; a silent rule returning true without moving pos throws
  // "inline rule didn't increment state.pos". Silent callers only probe and
  // reset pos themselves, so advancing here is safe.
  state.pos = end + 1
  if (silent) return true
  const token = state.push('footnote_ref', 'span', 0)
  token.content = label
  return true
}

export const FootnoteRef = Node.create({
  name: 'footnoteRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-footnote-ref') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-footnote-ref': attributes.label
        })
      }
    }
  },

  parseHTML() {
    // A <span> on purpose: <sup> would also match the superscript mark, and
    // ProseMirror prefers marks over inline atoms for that tag.
    return [{ tag: 'span[data-footnote-ref]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'footnote-ref' }),
      `[^${String(node.attrs.label)}]`
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: Record<string, unknown> }) {
          state.write(`[^${String(node.attrs.label)}]`)
        },
        parse: {
          setup(md: MdWithFootnoteRule) {
            if (md.__footnoteRefRegistered) return
            md.__footnoteRefRegistered = true
            md.inline.ruler.before('link', 'footnote_ref', footnoteRefRule)
            md.renderer.rules.footnote_ref = (tokens, idx) => {
              const label = tokens[idx].content
              return `<span data-footnote-ref="${escapeHtml(label)}">[^${escapeHtml(label)}]</span>`
            }
          }
        }
      }
    }
  }
})
