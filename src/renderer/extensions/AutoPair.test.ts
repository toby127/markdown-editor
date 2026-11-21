/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { createMarkdownExtensions } from '../../shared/md-extensions'
import { AutoPair } from './AutoPair'

function open(markdown = ''): Editor {
  return new Editor({ extensions: [...createMarkdownExtensions(), AutoPair], content: markdown })
}

/** Simulate typing via ProseMirror's handleTextInput (real input path). */
function type(editor: Editor, ch: string): void {
  const view = editor.view
  const from = view.state.selection.from
  let handled = false
  view.someProp('handleTextInput', (fn) => {
    handled = !!fn(view, from, from, ch)
    return handled
  })
  if (!handled) view.dispatch(view.state.tr.insertText(ch, from))
}

/** Use doc textContent rather than Markdown serialization: markdown-it escapes
 * brackets and markdown markers, which would obscure what the plugin inserted. */
function text(editor: Editor): string {
  return editor.state.doc.textContent
}

describe('AutoPair', () => {
  it('pairs brackets/quotes and leaves the caret between them', () => {
    const editor = open()
    type(editor, '(')
    expect(text(editor)).toBe('()')
    expect(editor.state.selection.from).toBe(2) // between '(' and ')'
    editor.destroy()
  })

  it('pairs each supported opener', () => {
    for (const [opener, closer] of [['[', ']'], ['{', '}'], ['"', '"'], ["'", "'"]]) {
      const editor = open()
      type(editor, opener)
      expect(text(editor)).toBe(opener + closer)
      editor.destroy()
    }
  })

  it('wraps the current selection', () => {
    const editor = open('abc')
    editor.commands.setTextSelection({ from: 1, to: 4 }) // select "abc"
    const view = editor.view
    const { from, to } = view.state.selection
    let handled = false
    view.someProp('handleTextInput', (fn) => {
      handled = !!fn(view, from, to, '(')
      return handled
    })
    expect(handled).toBe(true)
    expect(text(editor)).toBe('(abc)')
    editor.destroy()
  })

  it('does NOT pair markdown syntax markers', () => {
    const editor = open()
    for (const ch of ['*', '_', '`', '$']) {
      type(editor, ch)
    }
    expect(text(editor)).toBe('*_`$')
    editor.destroy()
  })

  it('steps over an existing closing char instead of doubling the pair', () => {
    const editor = open('()')
    editor.commands.setTextSelection(2) // between '(' and ')'
    type(editor, '(') // opener, but ')' is already to the right
    expect(text(editor)).toBe('()')
    expect(editor.state.selection.from).toBe(3) // caret moved past ')'
    editor.destroy()
  })
})
