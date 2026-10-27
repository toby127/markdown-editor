// src/renderer/extensions/CurrentBlockMarkdown.ts
import { Extension, Node, mergeAttributes, type Editor } from '@tiptap/core'
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { findTopLevelBlock } from './current-block-md'

/** Kept in schema for compatibility; hybrid mode never inserts it on focus. */
export const MarkdownSource = Node.create({
  name: 'markdownSource',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  marks: '',
  parseHTML() {
    return [{ tag: 'pre.markdown-source' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes({ class: 'markdown-source' }, HTMLAttributes), ['code', 0]]
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { textContent: string }
        ) {
          state.write(node.textContent)
          state.closeBlock(node)
        }
      }
    }
  }
})

const pluginKey = new PluginKey<DecorationSet>('currentBlockMarkdown')

const LIST_ROOT_TYPES = new Set(['bulletList', 'orderedList', 'taskList'])
const LIST_ITEM_TYPES = new Set(['listItem', 'taskItem'])

function markerTextForHeading(node: PMNode): string | null {
  if (node.type.name !== 'heading') return null
  const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1
  return '#'.repeat(Math.min(Math.max(level, 1), 6))
}

function markerTextForListItem(item: PMNode, parent: PMNode, index: number): string | null {
  if (item.type.name === 'taskItem') {
    return item.attrs.checked ? '[x]' : '[ ]'
  }
  if (parent.type.name === 'bulletList') {
    return '- '
  }
  if (parent.type.name === 'orderedList') {
    const start = typeof parent.attrs.start === 'number' ? parent.attrs.start : 1
    return `${start + index}. `
  }
  if (parent.type.name === 'taskList') {
    // taskList children should be taskItem; fall back for safety
    return item.attrs.checked ? '[x]' : '[ ]'
  }
  return null
}

/**
 * Prefer the nearest listItem/taskItem under the caret when the top-level
 * block is a list root; otherwise decorate the top-level block itself.
 */
function resolveFocusMarkerTarget(
  $from: ResolvedPos
): { pos: number; marker: string } | null {
  const found = findTopLevelBlock($from)
  if (!found) return null

  if (LIST_ROOT_TYPES.has(found.node.type.name)) {
    for (let d = $from.depth; d >= 1; d--) {
      const node = $from.node(d)
      if (!LIST_ITEM_TYPES.has(node.type.name)) continue
      const parent = $from.node(d - 1)
      const index = $from.index(d - 1)
      const marker = markerTextForListItem(node, parent, index)
      if (!marker) return null
      return { pos: $from.before(d), marker }
    }
    // Caret somehow on list root with no item — no marker
    return null
  }

  const marker = markerTextForHeading(found.node)
  if (!marker) return null
  return { pos: found.pos, marker }
}

function buildFocusDecorations(doc: PMNode, $from: ResolvedPos): DecorationSet {
  const target = resolveFocusMarkerTarget($from)
  if (!target) return DecorationSet.empty

  // Widget at the start of the block/item content.
  const deco = Decoration.widget(
    target.pos + 1,
    () => {
      const span = document.createElement('span')
      span.className = 'md-marker'
      span.textContent = target.marker
      span.setAttribute('contenteditable', 'false')
      return span
    },
    { side: -1, key: `md-marker-${target.pos}-${target.marker}` }
  )

  return DecorationSet.create(doc, [deco])
}

/**
 * Legacy API: previously swapped the focused block into markdownSource.
 * Hybrid mode never mutates the document for focus — decorations handle markers.
 * Kept so existing callers/tests remain valid.
 */
export function syncCurrentBlock(_editor: Editor): void {
  // intentionally empty
}

export const CurrentBlockMarkdown = Extension.create({
  name: 'currentBlockMarkdown',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          // Start empty so initial render stays clean (no markers until selection moves).
          init() {
            return DecorationSet.empty
          },
          apply(tr: Transaction, old: DecorationSet, _oldState: EditorState, newState: EditorState) {
            if (tr.docChanged || tr.selectionSet) {
              return buildFocusDecorations(newState.doc, newState.selection.$from)
            }
            return old.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state) ?? DecorationSet.empty
          }
        }
      })
    ]
  }
})
