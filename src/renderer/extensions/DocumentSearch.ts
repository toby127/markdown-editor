// Document-internal find & replace. Matching is done over ProseMirror text
// nodes and rendered as Decorations, so highlighting never mutates the doc and
// therefore never affects Markdown round-tripping. Only replace commands edit
// the document (as real text edits, which mark the tab dirty).
import { Extension, type Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  clampMatchIndex,
  findInSegments,
  type DocMatch,
  type SearchOptions,
  type TextSegment
} from '../../shared/doc-search'

export type DocumentSearchState = {
  query: string
  options: SearchOptions
  matches: DocMatch[]
  currentIndex: number
}

export type DocumentSearchMeta =
  | { type: 'setQuery'; query: string; options?: SearchOptions }
  | { type: 'setOptions'; options: SearchOptions }
  | { type: 'setIndex'; index: number }
  | { type: 'clear' }

const searchPluginKey = new PluginKey<DocumentSearchState>('documentSearch')

const EMPTY_STATE: DocumentSearchState = {
  query: '',
  options: { caseSensitive: false, wholeWord: false },
  matches: [],
  currentIndex: -1
}

/** Collect every text node into segments with their document positions. */
function collectSegments(doc: PMNode): TextSegment[] {
  const segments: TextSegment[] = []
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ text: node.text, pos })
    }
    return true
  })
  return segments
}

function recompute(state: DocumentSearchState, doc: PMNode): DocumentSearchState {
  if (!state.query) return { ...state, matches: [], currentIndex: -1 }
  const matches = findInSegments(collectSegments(doc), state.query, state.options)
  return {
    ...state,
    matches,
    currentIndex: matches.length ? clampMatchIndex(state.currentIndex, matches.length) : -1
  }
}

function applyMeta(prev: DocumentSearchState, meta: DocumentSearchMeta, doc: PMNode): DocumentSearchState {
  switch (meta.type) {
    case 'setQuery': {
      const next: DocumentSearchState = {
        ...prev,
        query: meta.query,
        options: meta.options ?? prev.options,
        // Start at the first match whenever the query changes.
        currentIndex: 0
      }
      return recompute(next, doc)
    }
    case 'setOptions': {
      return recompute({ ...prev, options: meta.options, currentIndex: 0 }, doc)
    }
    case 'setIndex': {
      return { ...prev, currentIndex: clampMatchIndex(meta.index, prev.matches.length) }
    }
    case 'clear': {
      return { ...EMPTY_STATE, options: prev.options }
    }
  }
}

function getState(state: EditorState): DocumentSearchState {
  return searchPluginKey.getState(state) ?? EMPTY_STATE
}

export type DocumentSearchCommands = {
  setSearchQuery: (query: string, options?: SearchOptions) => boolean
  setSearchOptions: (options: SearchOptions) => boolean
  nextMatch: () => boolean
  previousMatch: () => boolean
  clearSearch: () => boolean
  /** Replace the current match; returns false when there is none. */
  replaceCurrent: (replacement: string) => boolean
  /** Replace all matches; returns the number of replacements. */
  replaceAll: (replacement: string) => number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentSearch: DocumentSearchCommands & { [K in keyof DocumentSearchCommands]: (...args: never[]) => ReturnType }
  }
}

export const DocumentSearch = Extension.create({
  name: 'documentSearch',

  addProseMirrorPlugins() {
    return [
      new Plugin<DocumentSearchState>({
        key: searchPluginKey,
        state: {
          init: () => EMPTY_STATE,
          apply(tr: Transaction, prev: DocumentSearchState, _old: EditorState, next: EditorState) {
            const meta = tr.getMeta(searchPluginKey) as DocumentSearchMeta | undefined
            let value = meta ? applyMeta(prev, meta, next.doc) : prev
            if (!meta && tr.docChanged) value = recompute(value, next.doc)
            return value
          }
        },
        props: {
          decorations(state: EditorState) {
            const { matches, currentIndex } = getState(state)
            if (!matches.length) return DecorationSet.empty
            const decos = matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === currentIndex ? 'doc-search-hit doc-search-hit-current' : 'doc-search-hit'
              })
            )
            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      setSearchQuery:
        (query: string, options?: SearchOptions) =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setQuery', query, options } satisfies DocumentSearchMeta)
          }
          return true
        },
      setSearchOptions:
        (options: SearchOptions) =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setOptions', options } satisfies DocumentSearchMeta)
          }
          return true
        },
      nextMatch:
        () =>
        ({ state, dispatch, tr }) => {
          const { matches, currentIndex } = getState(state)
          if (!matches.length) return false
          const index = clampMatchIndex(currentIndex + 1, matches.length)
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setIndex', index } satisfies DocumentSearchMeta)
          }
          return true
        },
      previousMatch:
        () =>
        ({ state, dispatch, tr }) => {
          const { matches, currentIndex } = getState(state)
          if (!matches.length) return false
          const index = clampMatchIndex(currentIndex - 1, matches.length)
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setIndex', index } satisfies DocumentSearchMeta)
          }
          return true
        },
      clearSearch:
        () =>
        ({ dispatch, tr }) => {
          if (dispatch) tr.setMeta(searchPluginKey, { type: 'clear' } satisfies DocumentSearchMeta)
          return true
        },
      replaceCurrent:
        (replacement: string) =>
        ({ state, dispatch, tr }) => {
          const { matches, currentIndex } = getState(state)
          if (!matches.length || currentIndex < 0) return false
          const target = matches[currentIndex]
          if (dispatch) {
            tr.insertText(replacement, target.from, target.to)
          }
          return true
        },
      replaceAll:
        (replacement: string) =>
        ({ state, dispatch, tr }) => {
          const { matches } = getState(state)
          if (!matches.length) return 0
          if (dispatch) {
            // Replace from the end so earlier positions stay valid.
            for (let i = matches.length - 1; i >= 0; i -= 1) {
              const m = matches[i]
              tr.insertText(replacement, m.from, m.to)
            }
            tr.setMeta(searchPluginKey, { type: 'clear' } satisfies DocumentSearchMeta)
          }
          return matches.length
        }
    }
  }
})

/** Read current search state (for UI match counters). */
export function readDocumentSearch(editor: Editor): DocumentSearchState {
  return getState(editor.state)
}

/** Move the selection to the current match and scroll it into view. */
export function focusCurrentMatch(editor: Editor): void {
  const { matches, currentIndex } = getState(editor.state)
  if (!matches.length) return
  const m = matches[clampMatchIndex(currentIndex, matches.length)]
  editor.chain().setTextSelection({ from: m.from, to: m.to }).run()
  const dom = editor.view.domAtPos(m.from)
  const el = (dom.node as HTMLElement).parentElement ?? (dom.node.nodeType === 1 ? (dom.node as HTMLElement) : null)
  el?.scrollIntoView({ block: 'center' })
}
