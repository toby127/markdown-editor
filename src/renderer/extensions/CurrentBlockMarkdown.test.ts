/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { afterEach, describe, expect, it } from 'vitest'
import { CurrentBlockMarkdown, MarkdownSource, syncCurrentBlock } from './CurrentBlockMarkdown'

function createEditor(content: string): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
      MarkdownSource,
      CurrentBlockMarkdown
    ],
    content
  })
}

/** Simulate real typing so TipTap/ProseMirror input rules can fire. */
function typeText(editor: Editor, text: string): void {
  const view = editor.view
  for (const ch of text) {
    const from = view.state.selection.from
    let handled = false
    view.someProp('handleTextInput', (f) => {
      handled = !!f(view, from, from, ch)
      return handled
    })
    if (!handled) {
      view.dispatch(view.state.tr.insertText(ch, from))
    }
  }
}

function topLevelTypes(editor: Editor): string[] {
  return [...Array(editor.state.doc.childCount)].map((_, i) => editor.state.doc.child(i).type.name)
}

function focusMarkers(editor: Editor): Element[] {
  return [...editor.view.dom.querySelectorAll('.md-marker')]
}

describe('CurrentBlockMarkdown (Typora hybrid)', () => {
  let editor: Editor
  afterEach(() => {
    editor?.destroy()
  })

  it('keeps heading rendered on focus — does not insert markdownSource', () => {
    editor = createEditor('# Hello\n\npara\n')
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Hello')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
    expect(editor.view.dom.querySelector('pre.markdown-source')).toBeNull()
  })

  it('shows markdown markers as decorations while heading stays styled', () => {
    editor = createEditor('# Hello\n\npara\n')
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    const markers = focusMarkers(editor)
    expect(markers.length).toBeGreaterThan(0)
    expect(markers.some((el) => /#/.test(el.textContent ?? ''))).toBe(true)
    expect(editor.view.dom.querySelector('h1')?.textContent).toContain('Hello')
  })

  it('keeps both blocks rendered when selection moves to another block', () => {
    editor = createEditor('# Hello\n\npara\n')
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    const secondPos = editor.state.doc.firstChild!.nodeSize + 1
    editor.commands.setTextSelection(secondPos + 1)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Hello')
    expect(editor.state.doc.child(1)?.type.name).toBe('paragraph')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
    expect(editor.view.dom.querySelector('pre.markdown-source')).toBeNull()
  })

  it('skips while composing', () => {
    editor = createEditor('# Hello\n\npara\n')
    Object.defineProperty(editor.view, 'composing', {
      configurable: true,
      get: () => true
    })
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('keeps neighbor rendered when focusing first heading', () => {
    editor = createEditor('# A\n\n## B\n')
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('A')
    expect(editor.state.doc.child(1)?.type.name).toBe('heading')
    expect(editor.state.doc.child(1)?.textContent).toBe('B')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('getMarkdown emits valid markdown while a block is focused (no source pre)', () => {
    editor = createEditor('# Hello\n\nworld\n')
    editor.commands.setTextSelection(2)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md).not.toMatch(/<pre\b/i)
    expect(md).not.toMatch(/markdown-source/)
    expect(md).not.toMatch(/<\/?body>/i)
    expect(md).toMatch(/#\s*Hello/)
    expect(md).toMatch(/world/)
  })

  it('keeps taskList rendered on focus — does not enter markdownSource', () => {
    editor = createEditor('- [ ] a\n')
    editor.commands.setTextSelection(3)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('taskList')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
    expect(editor.view.dom.querySelector('pre.markdown-source')).toBeNull()
  })

  it('shows md-marker for focused list item without markdownSource', () => {
    editor = createEditor('- item one\n')
    editor.commands.setTextSelection(3)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('bulletList')
    const markers = focusMarkers(editor)
    expect(markers.length).toBeGreaterThan(0)
    expect(markers.some((el) => (el.textContent ?? '').startsWith('-'))).toBe(true)
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
    expect(editor.view.dom.querySelector('pre.markdown-source')).toBeNull()
  })

  it('shows md-marker for focused task list item without markdownSource', () => {
    editor = createEditor('- [ ] a\n')
    editor.commands.setTextSelection(3)
    syncCurrentBlock(editor)
    expect(editor.state.doc.firstChild?.type.name).toBe('taskList')
    const markers = focusMarkers(editor)
    expect(markers.length).toBeGreaterThan(0)
    expect(markers.some((el) => /\[[ xX]\]/.test(el.textContent ?? ''))).toBe(true)
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('typing **bold** converts to bold mark immediately', () => {
    editor = createEditor('x\n')
    editor.commands.setTextSelection(1)
    // Clear paragraph then type markdown markers
    editor.commands.selectAll()
    editor.commands.deleteSelection()
    typeText(editor, '**bold**')
    expect(editor.getHTML()).toMatch(/<(strong|b)>bold<\/(strong|b)>/)
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('typing # space converts paragraph to heading immediately', () => {
    editor = createEditor('x\n')
    editor.commands.selectAll()
    editor.commands.deleteSelection()
    typeText(editor, '# Hello')
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.attrs.level).toBe(1)
    expect(editor.state.doc.firstChild?.textContent).toBe('Hello')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })
})
