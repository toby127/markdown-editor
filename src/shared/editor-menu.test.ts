/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMarkdownExtensions } from './md-extensions'
import {
  applyEditorMenuAction,
  buildFormatMenuSpecs,
  buildParagraphMenuSpecs,
  flattenCommands
} from './editor-menu'

function createEditor(content = 'hello'): Editor {
  return new Editor({
    extensions: createMarkdownExtensions(),
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

  it('insertTable inserts a real table (3x3 with header)', () => {
    editor = createEditor('hello')
    expect(applyEditorMenuAction(editor, 'insertTable')).toBe(true)
    expect(editor.isActive('table')).toBe(true)
    expect(editor.getHTML()).toContain('<table')
    expect(editor.getHTML()).toContain('<th')
  })

  it('image inserts an image node from prompt URL', () => {
    editor = createEditor('hello')
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('https://example.com/pic.png')
      .mockReturnValueOnce('a picture')
    expect(applyEditorMenuAction(editor, 'image')).toBe(true)
    expect(editor.getHTML()).toContain('<img')
    expect(editor.getHTML()).toContain('src="https://example.com/pic.png"')
    prompt.mockRestore()
  })

  it('image with empty URL is a no-op', () => {
    editor = createEditor('hello')
    const before = editor.getHTML()
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('')
    expect(applyEditorMenuAction(editor, 'image')).toBe(false)
    expect(editor.getHTML()).toBe(before)
    prompt.mockRestore()
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

  it('mathBlock inserts a verbatim $$ block', () => {
    editor = createEditor('hello')
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('E = mc^2')
    expect(applyEditorMenuAction(editor, 'mathBlock')).toBe(true)
    expect(editor.storage.markdown.getMarkdown()).toContain('$$\nE = mc^2\n$$')
    prompt.mockRestore()
  })

  it('mathBlock cancel is a no-op', () => {
    editor = createEditor('hello')
    const before = editor.getHTML()
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce(null)
    expect(applyEditorMenuAction(editor, 'mathBlock')).toBe(false)
    expect(editor.getHTML()).toBe(before)
    prompt.mockRestore()
  })

  it('paragraph sets paragraph from heading', () => {
    editor = createEditor('# Hi\n')
    editor.commands.selectAll()
    applyEditorMenuAction(editor, 'paragraph')
    expect(editor.isActive('paragraph')).toBe(true)
  })

  it('footnote inserts reference and definition that roundtrip unescaped', () => {
    editor = createEditor('hello')
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('1')
      .mockReturnValueOnce('see appendix')
    expect(applyEditorMenuAction(editor, 'footnote')).toBe(true)
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md).toContain('[^1]')
    expect(md).toContain('[^1]: see appendix')
    expect(md).not.toContain('\\[^1\\]')
    prompt.mockRestore()
  })

  it('toc generates a nested link list from document headings', () => {
    editor = createEditor('# Intro\n\n## Details\n\ntext')
    expect(applyEditorMenuAction(editor, 'toc')).toBe(true)
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md).toContain('- [Intro](#intro)')
    expect(md).toContain('  - [Details](#details)')
  })

  it('toc is a no-op when the document has no headings', () => {
    editor = createEditor('plain text')
    expect(applyEditorMenuAction(editor, 'toc')).toBe(false)
  })

  it('yamlFrontMatter inserts a frontMatter node at the document start', () => {
    editor = createEditor('body')
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('My Doc')
      .mockReturnValueOnce('go, markdown')
    expect(applyEditorMenuAction(editor, 'yamlFrontMatter')).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('frontMatter')
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('title: My Doc')
    expect(md).toContain('tags: [go, markdown]')
    prompt.mockRestore()
  })

  it('yamlFrontMatter replaces an existing block instead of stacking', () => {
    editor = createEditor('---\ntitle: old\n---\n\nbody')
    expect(editor.state.doc.firstChild?.type.name).toBe('frontMatter')
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('New')
      .mockReturnValueOnce('')
    expect(applyEditorMenuAction(editor, 'yamlFrontMatter')).toBe(true)
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md.match(/^---$/gm)).toHaveLength(2)
    expect(md).toContain('title: New')
    expect(md).not.toContain('title: old')
    prompt.mockRestore()
  })

  it('htmlBlock keeps raw HTML source in a fenced block', () => {
    editor = createEditor('body')
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('<div>hi</div>')
    expect(applyEditorMenuAction(editor, 'htmlBlock')).toBe(true)
    expect(editor.storage.markdown.getMarkdown()).toContain('```html\n<div>hi</div>\n```')
    prompt.mockRestore()
  })

  it('linkReference inserts a real link with the requested href', () => {
    editor = createEditor('body')
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('docs')
      .mockReturnValueOnce('https://example.com')
    expect(applyEditorMenuAction(editor, 'linkReference')).toBe(true)
    expect(editor.storage.markdown.getMarkdown()).toContain('[docs](https://example.com)')
    prompt.mockRestore()
  })

  it('deleteBlock removes the block under the caret', () => {
    editor = createEditor('# Heading\n\nbody')
    editor.commands.setTextSelection(3)
    expect(applyEditorMenuAction(editor, 'deleteBlock')).toBe(true)
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md).not.toContain('Heading')
    expect(md).toContain('body')
  })

  it('superscript and subscript toggle the installed marks', () => {
    editor = createEditor('x2')
    editor.commands.selectAll()
    expect(applyEditorMenuAction(editor, 'superscript')).toBe(true)
    expect(editor.isActive('superscript')).toBe(true)
    expect(applyEditorMenuAction(editor, 'subscript')).toBe(true)
    expect(editor.isActive('subscript')).toBe(true)
  })

  it('inlineMath inserts $...$ source', () => {
    editor = createEditor('body')
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('x^2')
    expect(applyEditorMenuAction(editor, 'inlineMath')).toBe(true)
    expect(editor.storage.markdown.getMarkdown()).toContain('$x^2$')
    prompt.mockRestore()
  })

  it('comment keeps the comment source in a fenced block', () => {
    editor = createEditor('body')
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('TODO: check')
    expect(applyEditorMenuAction(editor, 'comment')).toBe(true)
    expect(editor.storage.markdown.getMarkdown()).toContain('<!-- TODO: check -->')
    prompt.mockRestore()
  })
})
