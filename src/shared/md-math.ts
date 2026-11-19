import { Node, mergeAttributes } from '@tiptap/core'

/**
 * `$$` fenced math as a dedicated block node.
 *
 * Without this, markdown-it parses the three lines as one paragraph and the
 * Markdown serializer collapses its softbreaks: `$$\nE = mc^2\n$$` comes back
 * as `$$ E = mc^2 $$`. Owning the node keeps the source byte-for-byte and
 * gives a future KaTeX renderer a single node to attach to.
 */

type BlockState = {
  src: string
  bMarks: number[]
  eMarks: number[]
  line: number
  push: (type: string, tag: string, nesting: number) => { content: string; map: number[] }
}

type MdWithMath = {
  __mathBlockRegistered?: boolean
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

function mathBlockRule(state: BlockState, startLine: number, endLine: number, silent: boolean): boolean {
  const first = state.src.slice(state.bMarks[startLine], state.eMarks[startLine]).trim()
  if (first !== '$$') return false

  let closeLine = startLine + 1
  while (closeLine < endLine) {
    const line = state.src.slice(state.bMarks[closeLine], state.eMarks[closeLine]).trim()
    if (line === '$$') break
    closeLine += 1
  }
  if (closeLine >= endLine) return false
  if (silent) return true

  const lines = state.src.split('\n')
  const token = state.push('math_block', 'pre', 0)
  token.content = lines.slice(startLine + 1, closeLine).join('\n')
  token.map = [startLine, closeLine + 1]
  state.line = closeLine + 1
  return true
}

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  marks: '',

  parseHTML() {
    return [{ tag: 'pre[data-math-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes({ 'data-math-block': '', class: 'math-block' }, HTMLAttributes),
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
          state.write(`$$\n${node.textContent}\n$$`)
          state.closeBlock(node)
        },
        parse: {
          setup(md: MdWithMath) {
            if (md.__mathBlockRegistered) return
            md.__mathBlockRegistered = true
            md.block.ruler.before('paragraph', 'math_block', mathBlockRule)
            md.renderer.rules.math_block = (tokens, idx) =>
              `<pre data-math-block>${escapeHtml(tokens[idx].content)}</pre>\n`
          }
        }
      }
    }
  }
})
