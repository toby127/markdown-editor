import { Node, mergeAttributes } from '@tiptap/core'
import { parseWikiLink } from './wiki-link'

/**
 * `[[Target]]` / `[[Target|Alias]]` as an inline atom.
 *
 * Plain text would be escaped by tiptap-markdown (`\[\[Target\]\]`) and would
 * stop being a wiki link for every other tool. A Link mark is not suitable
 * either: it serializes to `[Alias](Target)` and loses the wiki syntax.
 * Owning a node keeps the source bytes intact and gives the click handler a
 * stable DOM hook.
 */

type InlineState = {
  src: string
  pos: number
  push: (type: string, tag: string, nesting: number) => { content: string }
}

type MdWithWikiRule = {
  /** Per-parser marker: extension instances are reused across editors. */
  __wikiLinkRegistered?: boolean
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

function wikiLinkRule(state: InlineState, silent: boolean): boolean {
  const { src, pos } = state
  if (src[pos] !== '[' || src[pos + 1] !== '[') return false
  const close = src.indexOf(']]', pos + 2)
  if (close < 0) return false
  const inner = src.slice(pos + 2, close)
  // A wiki link is always contained in one line and cannot nest brackets.
  if (/[\[\]\n]/.test(inner)) return false
  const parsed = parseWikiLink(inner)
  if (!parsed) return false
  if (silent) return true

  const token = state.push('wiki_link', 'span', 0)
  token.content = inner
  state.pos = close + 2
  return true
}

export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-wiki-link') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-wiki-link': attributes.target
        })
      },
      alias: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-wiki-alias') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-wiki-alias': attributes.alias
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const alias = String(node.attrs.alias ?? '')
    const target = String(node.attrs.target ?? '')
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'wiki-link' }),
      alias || target
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void },
          node: { attrs: Record<string, unknown> }
        ) {
          const target = String(node.attrs.target ?? '')
          const alias = String(node.attrs.alias ?? '')
          state.write(alias ? `[[${target}|${alias}]]` : `[[${target}]]`)
        },
        parse: {
          setup(md: MdWithWikiRule) {
            if (md.__wikiLinkRegistered) return
            md.__wikiLinkRegistered = true
            md.inline.ruler.before('link', 'wiki_link', wikiLinkRule)
            md.renderer.rules.wiki_link = (tokens, idx) => {
              const parsed = parseWikiLink(tokens[idx].content)
              if (!parsed) return ''
              const label = parsed.alias ?? parsed.target
              return (
                `<span data-wiki-link="${escapeHtml(parsed.target)}"` +
                ` data-wiki-alias="${escapeHtml(parsed.alias ?? '')}">` +
                `${escapeHtml(label)}</span>`
              )
            }
          }
        }
      }
    }
  }
})
