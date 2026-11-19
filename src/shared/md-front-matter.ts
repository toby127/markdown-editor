import { Node, mergeAttributes } from '@tiptap/core'

/**
 * YAML Front Matter as a first-class block.
 *
 * Without a dedicated node, `---\ntitle: x\n---` is parsed by markdown-it as
 * horizontalRule + heading + horizontalRule; `[a, b]` then gets escaped on
 * serialize, so the metadata is silently rewritten. A block rule claims the
 * opening/closing `---` pair before markdown-it's `hr` rule can see it and
 * stores the body verbatim as text.
 */

type BlockState = {
  src: string
  bMarks: number[]
  eMarks: number[]
  line: number
  lineMax: number
  push: (type: string, tag: string, nesting: number) => { content: string; map: number[] }
}

type MdWithFrontMatter = {
  __frontMatterRegistered?: boolean
  block: {
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

function frontMatterRule(state: BlockState, startLine: number, endLine: number, silent: boolean): boolean {
  // Front matter is only valid at the very start of the document.
  if (startLine !== 0) return false
  const firstLine = state.src.slice(state.bMarks[startLine], state.eMarks[startLine]).trim()
  if (firstLine !== '---') return false

  let closeLine = startLine + 1
  while (closeLine < endLine) {
    const line = state.src.slice(state.bMarks[closeLine], state.eMarks[closeLine]).trim()
    if (line === '---') break
    closeLine += 1
  }
  if (closeLine >= endLine) return false

  if (silent) return true
  const lines = state.src.split('\n')
  const token = state.push('front_matter', 'pre', 0)
  token.content = lines.slice(startLine + 1, closeLine).join('\n')
  token.map = [startLine, closeLine + 1]
  state.line = closeLine + 1
  return true
}

export const FrontMatter = Node.create({
  name: 'frontMatter',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  marks: '',

  parseHTML() {
    return [{ tag: 'pre[data-front-matter]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes({ 'data-front-matter': '', class: 'front-matter' }, HTMLAttributes),
      ['code', 0]
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { textContent: string }
        ) {
          state.write(`---\n${node.textContent}\n---`)
          state.closeBlock(node)
        },
        parse: {
          setup(md: MdWithFrontMatter) {
            if (md.__frontMatterRegistered) return
            md.__frontMatterRegistered = true
            md.block.ruler.before('hr', 'front_matter', frontMatterRule)
            md.renderer.rules.front_matter = (tokens, idx) =>
              `<pre data-front-matter>${escapeHtml(tokens[idx].content)}</pre>\n`
          }
        }
      }
    }
  }
})
