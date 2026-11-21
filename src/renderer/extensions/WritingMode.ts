// Distraction-free writing aids, implemented purely with ProseMirror state and
// decorations so the document (and therefore its Markdown round-trip) is never
// modified. Two independent toggles, driven via meta transactions:
//  - focusMode: dim every top-level block except the one under the caret
//  - typewriterMode: keep the active block vertically centered while typing
import { Extension, type Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export type WritingModeState = {
  focusMode: boolean
  typewriterMode: boolean
}

export type WritingModeMeta =
  | { type: 'setFocusMode'; value: boolean }
  | { type: 'setTypewriterMode'; value: boolean }

const writingModeKey = new PluginKey<WritingModeState>('writingMode')
const focusDecoKey = new PluginKey<DecorationSet>('writingModeFocusDeco')

const DEFAULT_STATE: WritingModeState = { focusMode: false, typewriterMode: false }

/** Ranges of every top-level block in the document. */
function topLevelBlocks(doc: PMNode): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = []
  doc.forEach((node, offset) => {
    ranges.push({ from: offset, to: offset + node.nodeSize })
  })
  return ranges
}

/** Start position of the top-level block containing the caret. */
function activeBlockFrom(state: EditorState): number {
  const $from = state.selection.$from
  if ($from.depth < 1) return 0
  return $from.before(1)
}

function buildFocusDecorations(state: EditorState, enabled: boolean): DecorationSet {
  if (!enabled) return DecorationSet.empty
  const active = activeBlockFrom(state)
  const decos: Decoration[] = []
  for (const { from, to } of topLevelBlocks(state.doc)) {
    if (from === active) continue
    decos.push(Decoration.node(from, to, { class: 'is-dimmed' }))
  }
  return DecorationSet.create(state.doc, decos)
}

function readState(state: EditorState): WritingModeState {
  return writingModeKey.getState(state) ?? DEFAULT_STATE
}

export type WritingModeCommands = {
  setFocusMode: (value: boolean) => boolean
  setTypewriterMode: (value: boolean) => boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    writingMode: {
      [K in keyof WritingModeCommands]: (...args: Parameters<WritingModeCommands[K]>) => ReturnType
    }
  }
}

export const WritingMode = Extension.create({
  name: 'writingMode',

  addProseMirrorPlugins() {
    // Meta-driven mode state (cheap, no doc mutation).
    const modePlugin = new Plugin<WritingModeState>({
      key: writingModeKey,
      state: {
        init: () => ({ ...DEFAULT_STATE }),
        apply(tr: Transaction, prev: WritingModeState): WritingModeState {
          const meta = tr.getMeta(writingModeKey) as WritingModeMeta | undefined
          if (!meta) return prev
          if (meta.type === 'setFocusMode') return { ...prev, focusMode: meta.value }
          if (meta.type === 'setTypewriterMode') return { ...prev, typewriterMode: meta.value }
          return prev
        }
      }
    })

    // Focus decorations depend on mode + selection + doc.
    const focusPlugin = new Plugin<DecorationSet>({
      key: focusDecoKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr: Transaction, _old: DecorationSet, _prev: EditorState, next: EditorState) {
          const mode = readState(next)
          if (tr.docChanged || tr.selectionSet || tr.getMeta(writingModeKey)) {
            return buildFocusDecorations(next, mode.focusMode)
          }
          return _old.map(tr.mapping, tr.doc)
        }
      },
      props: {
        decorations(state: EditorState) {
          return focusDecoKey.getState(state) ?? DecorationSet.empty
        }
      }
    })

    // Typewriter: scroll the active block to vertical center on caret moves.
    const typewriterPlugin = new Plugin({
      view(view) {
        let lastFrom = -1
        return {
          update(updatedView, prevState) {
            if (!readState(updatedView.state).typewriterMode) {
              lastFrom = -1
              return
            }
            const from = activeBlockFrom(updatedView.state)
            const selectionChanged = !prevState.selection.eq(updatedView.state.selection)
            const docChanged = !prevState.doc.eq(updatedView.state.doc)
            if (!selectionChanged && !docChanged) return
            if (from === lastFrom && docChanged) return // typing in same block: caret scroll already handled
            lastFrom = from
            const dom = updatedView.domAtPos(from + 1)
            const el =
              (dom.node as HTMLElement).closest?.('p,h1,h2,h3,h4,h5,h6,li,pre') ??
              (dom.node.nodeType === 1 ? (dom.node as HTMLElement) : dom.node.parentElement)
            el?.scrollIntoView({ block: 'center' })
          }
        }
      }
    })

    return [modePlugin, focusPlugin, typewriterPlugin]
  },

  addCommands() {
    return {
      setFocusMode:
        (value: boolean) =>
        ({ dispatch, tr }) => {
          if (dispatch) tr.setMeta(writingModeKey, { type: 'setFocusMode', value } satisfies WritingModeMeta)
          return true
        },
      setTypewriterMode:
        (value: boolean) =>
        ({ dispatch, tr }) => {
          if (dispatch) tr.setMeta(writingModeKey, { type: 'setTypewriterMode', value } satisfies WritingModeMeta)
          return true
        }
    }
  }
})

/** Read current mode state (for UI toggle feedback). */
export function readWritingMode(editor: Editor): WritingModeState {
  return readState(editor.state)
}
