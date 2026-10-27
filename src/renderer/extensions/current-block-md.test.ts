/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SOURCEABLE_TYPES,
  findTopLevelBlock,
  parseMarkdownToSlice,
  serializeBlockMarkdown
} from './current-block-md'

function createEditor(content: string): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true })
    ],
    content
  })
}

describe('current-block-md helpers', () => {
  let editor: Editor
  afterEach(() => {
    editor?.destroy()
  })

  it('SOURCEABLE_TYPES lists approved top-level names', () => {
    expect([...SOURCEABLE_TYPES].sort()).toEqual(
      ['blockquote', 'bulletList', 'codeBlock', 'heading', 'orderedList', 'paragraph', 'taskList'].sort()
    )
  })

  it('findTopLevelBlock returns depth-1 heading', () => {
    editor = createEditor('# Hello\n\nworld\n')
    editor.commands.setTextSelection(2)
    const found = findTopLevelBlock(editor.state.selection.$from)
    expect(found!.node.type.name).toBe('heading')
    expect(found!.node.textContent).toBe('Hello')
    expect(found!.pos).toBe(0)
  })

  it('findTopLevelBlock returns bulletList when caret in list item', () => {
    editor = createEditor('- a\n- b\n')
    editor.commands.setTextSelection(3)
    expect(findTopLevelBlock(editor.state.selection.$from)!.node.type.name).toBe('bulletList')
  })

  it('serializeBlockMarkdown for heading', () => {
    editor = createEditor('# Title\n')
    const md = serializeBlockMarkdown(editor, editor.state.doc.firstChild!)
    expect(md.trim()).toBe('# Title')
  })

  it('parseMarkdownToSlice builds heading', () => {
    editor = createEditor('plain\n')
    const slice = parseMarkdownToSlice(editor, '# H1\n')
    expect(slice.content.firstChild?.type.name).toBe('heading')
    expect(slice.content.firstChild?.textContent).toBe('H1')
  })

  it('list serialize then parse yields bulletList', () => {
    editor = createEditor('- one\n- two\n')
    const md = serializeBlockMarkdown(editor, editor.state.doc.firstChild!)
    const slice = parseMarkdownToSlice(editor, md)
    expect(slice.content.firstChild?.type.name).toBe('bulletList')
  })

  it('findTopLevelBlock returns taskList when caret in task item', () => {
    editor = createEditor('- [ ] a\n')
    editor.commands.setTextSelection(3)
    expect(findTopLevelBlock(editor.state.selection.$from)!.node.type.name).toBe('taskList')
  })

  it('task list serialize then parse yields taskList', () => {
    editor = createEditor('- [ ] one\n- [x] two\n')
    const md = serializeBlockMarkdown(editor, editor.state.doc.firstChild!)
    const slice = parseMarkdownToSlice(editor, md)
    expect(slice.content.firstChild?.type.name).toBe('taskList')
  })

})
