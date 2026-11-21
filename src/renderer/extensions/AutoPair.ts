// Auto-pair brackets and quotes. Implemented as a ProseMirror handleTextInput
// plugin so it integrates with IME and undo history. Deliberately excludes
// Markdown syntax markers (* _ ` etc.): auto-pairing those fights with the
// hybrid editor's focus-block marker display, so we only pair literal brackets
// and quotes, matching the safe default described in docs/02.
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'"
}
const OPENERS = new Set(Object.keys(PAIRS))

const autoPairKey = new PluginKey('autoPair')

export const AutoPair = Extension.create({
  name: 'autoPair',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoPairKey,
        props: {
          handleTextInput(view, from, to, text) {
            // Only single-character openers; skip IME/composed multi-char input.
            if (text.length !== 1 || !OPENERS.has(text)) return false
            const close = PAIRS[text]
            const { state } = view
            const $from = state.doc.resolve(from)

            // Don't pair inside code blocks — code editors handle their own
            // pairing and doubling quotes in code is surprising.
            if ($from.parent.type.spec.code) return false

            // If the character to the right is already the matching close,
            // step the caret over it (editor-like "type through") without
            // inserting another pair.
            if (from === to && from < state.doc.content.size) {
              const next = state.doc.textBetween(from, from + 1)
              if (next === close) {
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)))
                return true
              }
            }

            const tr = state.tr
            if (from === to) {
              tr.insertText(text + close, from)
              tr.setSelection(TextSelection.create(tr.doc, from + 1))
            } else {
              const selected = state.doc.textBetween(from, to)
              tr.replaceWith(from, to, state.schema.text(text + selected + close))
              tr.setSelection(TextSelection.create(tr.doc, from + 1 + selected.length))
            }
            view.dispatch(tr)
            return true
          }
        }
      })
    ]
  }
})
