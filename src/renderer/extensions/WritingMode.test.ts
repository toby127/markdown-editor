/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { createMarkdownExtensions } from '../../shared/md-extensions'
import { readWritingMode, WritingMode } from './WritingMode'

function open(markdown: string): Editor {
  return new Editor({ extensions: [...createMarkdownExtensions(), WritingMode], content: markdown })
}

describe('WritingMode', () => {
  it('toggles focus and typewriter mode state independently', () => {
    const editor = open('one\n\ntwo\n')
    expect(readWritingMode(editor)).toEqual({ focusMode: false, typewriterMode: false })
    editor.commands.setFocusMode(true)
    expect(readWritingMode(editor).focusMode).toBe(true)
    expect(readWritingMode(editor).typewriterMode).toBe(false)
    editor.commands.setTypewriterMode(true)
    expect(readWritingMode(editor)).toEqual({ focusMode: true, typewriterMode: true })
    editor.commands.setFocusMode(false)
    expect(readWritingMode(editor).focusMode).toBe(false)
    editor.destroy()
  })

  it('never mutates the document / markdown', () => {
    const editor = open('# Title\n\npara one\n\npara two\n')
    const before = editor.storage.markdown.getMarkdown() as string
    editor.commands.setFocusMode(true)
    editor.commands.setTypewriterMode(true)
    // move selection around to trigger decoration recomputation
    editor.commands.setTextSelection(3)
    editor.commands.setTextSelection(12)
    expect(editor.storage.markdown.getMarkdown()).toBe(before)
    editor.destroy()
  })

  it('dims non-active top-level blocks when focus mode is on', () => {
    const editor = open('first para\n\nsecond para\n\nthird para\n')
    const host = document.createElement('div')
    document.body.appendChild(host)
    host.appendChild(editor.view.dom)
    editor.commands.setTextSelection(3) // caret in first block

    editor.commands.setFocusMode(true)
    // Force a decoration rebuild by toggling selection.
    editor.commands.setTextSelection(4)
    const dimmed = host.querySelectorAll('.ProseMirror > .is-dimmed')
    expect(dimmed.length).toBe(2) // second + third dimmed, first active

    editor.commands.setFocusMode(false)
    editor.commands.setTextSelection(5)
    expect(host.querySelectorAll('.ProseMirror > .is-dimmed').length).toBe(0)

    editor.destroy()
    host.remove()
  })
})
