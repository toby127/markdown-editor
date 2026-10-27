/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyEditorMenuAction,
  buildFormatMenuSpecs,
  buildParagraphMenuSpecs,
  flattenCommands
} from './editor-menu'

function createEditor(content = 'hello'): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Markdown.configure({ html: true })
    ],
    content
  })
}

describe('buildParagraphMenuSpecs', () => {
  it('uses catalog CN labels in order for top-level commands', () => {
    const labels = flattenCommands(buildParagraphMenuSpecs()).map((c) => c.label)
    expect(labels.slice(0, 9)).toEqual([
      '段落',
      '一级标题',
      '二级标题',
      '三级标题',
      '四级标题',
      '五级标题',
      '六级标题',
      '提升标题级别',
      '降低标题级别'
    ])
    expect(labels).toContain('表格')
    expect(labels).toContain('代码块')
    expect(labels).toContain('公式块')
    expect(labels).toContain('引用')
    expect(labels).toContain('有序列表')
    expect(labels).toContain('无序列表')
    expect(labels).toContain('任务列表')
    expect(labels).toContain('水平分割线')
    expect(labels).toContain('切换任务状态')
    expect(labels).toContain('增加缩进')
    expect(labels).toContain('减少缩进')
  })

  it('sets ordered list accelerator to CmdOrCtrl+Shift+[', () => {
    const ordered = flattenCommands(buildParagraphMenuSpecs()).find((c) => c.action === 'orderedList')
    expect(ordered?.accelerator).toBe('CmdOrCtrl+Shift+[')
  })
})

describe('buildFormatMenuSpecs', () => {
  it('uses catalog CN labels in order', () => {
    const labels = flattenCommands(buildFormatMenuSpecs()).map((c) => c.label)
    expect(labels.slice(0, 7)).toEqual([
      '加粗',
      '斜体',
      '下划线',
      '代码',
      '内联公式',
      '删除线',
      '高亮'
    ])
    expect(labels).toContain('超链接')
    expect(labels).toContain('图像')
    expect(labels).toContain('清除样式')
  })

  it('clearFormat uses CmdOrCtrl+\\', () => {
    const clear = flattenCommands(buildFormatMenuSpecs()).find((c) => c.action === 'clearFormat')
    expect(clear?.accelerator).toBe('CmdOrCtrl+\\')
  })
})

describe('applyEditorMenuAction', () => {
  let editor: Editor
  afterEach(() => {
    editor?.destroy()
  })

  it('heading1 toggles heading', () => {
    editor = createEditor('hello')
    editor.commands.selectAll()
    expect(applyEditorMenuAction(editor, 'heading1')).toBe(true)
    expect(editor.isActive('heading', { level: 1 })).toBe(true)
  })

  it('bold toggles bold', () => {
    editor = createEditor('hello')
    editor.commands.selectAll()
    expect(applyEditorMenuAction(editor, 'bold')).toBe(true)
    expect(editor.isActive('bold')).toBe(true)
  })

  it('underline toggles underline', () => {
    editor = createEditor('hello')
    editor.commands.selectAll()
    expect(applyEditorMenuAction(editor, 'underline')).toBe(true)
    expect(editor.isActive('underline')).toBe(true)
  })

  it('stub insertTable alerts and does not change doc', () => {
    editor = createEditor('hello')
    const before = editor.getHTML()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    expect(applyEditorMenuAction(editor, 'insertTable')).toBe(false)
    expect(alert).toHaveBeenCalledWith('暂不支持')
    expect(editor.getHTML()).toBe(before)
    alert.mockRestore()
  })


  it('taskToggle flips taskItem checked without unwrapping list', () => {
    editor = createEditor('- [ ] a\n')
    // caret inside task item text
    editor.commands.setTextSelection(3)
    expect(editor.isActive('taskList')).toBe(true)
    expect(editor.getAttributes('taskItem').checked).toBe(false)
    expect(applyEditorMenuAction(editor, 'taskToggle')).toBe(true)
    expect(editor.isActive('taskList')).toBe(true)
    expect(editor.getAttributes('taskItem').checked).toBe(true)
    expect(applyEditorMenuAction(editor, 'taskToggle')).toBe(true)
    expect(editor.isActive('taskList')).toBe(true)
    expect(editor.getAttributes('taskItem').checked).toBe(false)
  })

  it('stub mathBlock alerts and does not change doc', () => {
    editor = createEditor('hello')
    const before = editor.getHTML()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    expect(applyEditorMenuAction(editor, 'mathBlock')).toBe(false)
    expect(alert).toHaveBeenCalledWith('暂不支持')
    expect(editor.getHTML()).toBe(before)
    alert.mockRestore()
  })

  it('paragraph sets paragraph from heading', () => {
    editor = createEditor('# Hi\n')
    editor.commands.selectAll()
    applyEditorMenuAction(editor, 'paragraph')
    expect(editor.isActive('paragraph')).toBe(true)
  })
})
