import type { Editor } from '@tiptap/core'
import type { MenuActionName } from './ipc'
import { createHeadingSlugger } from './slugger'

export type EditorMenuCommandSpec = {
  type: 'command'
  action: MenuActionName
  label: string
  enabled: boolean
  accelerator?: string
}

export type EditorMenuSeparatorSpec = { type: 'separator' }

export type EditorMenuSubmenuSpec = {
  type: 'submenu'
  id: string
  label: string
  items: Array<EditorMenuCommandSpec | EditorMenuSeparatorSpec>
}

export type EditorMenuItemSpec =
  | EditorMenuCommandSpec
  | EditorMenuSeparatorSpec
  | EditorMenuSubmenuSpec

/**
 * Insert Markdown source at the caret. tiptap-markdown patches
 * `insertContentAt` so a string argument is parsed as Markdown rather than
 * HTML — this is the same parser used when opening a .md file, which is what
 * guarantees these inserted blocks survive an open/edit/save roundtrip.
 */
function insertMarkdown(editor: Editor, markdown: string): boolean {
  const { from, to } = editor.state.selection
  return editor.chain().focus().insertContentAt({ from, to }, markdown).run()
}

/** Insert at an absolute document position (used for front matter at pos 0). */
function insertMarkdownAt(editor: Editor, position: number, markdown: string): boolean {
  return editor.chain().focus().insertContentAt(position, markdown).run()
}

export function flattenCommands(items: EditorMenuItemSpec[]): EditorMenuCommandSpec[] {
  const out: EditorMenuCommandSpec[] = []
  for (const item of items) {
    if (item.type === 'command') out.push(item)
    else if (item.type === 'submenu') {
      for (const sub of item.items) {
        if (sub.type === 'command') out.push(sub)
      }
    }
  }
  return out
}

function cmd(
  action: MenuActionName,
  label: string,
  accelerator?: string
): EditorMenuCommandSpec {
  return { type: 'command', action, label, enabled: true, accelerator }
}

export function buildParagraphMenuSpecs(): EditorMenuItemSpec[] {
  return [
    cmd('paragraph', '段落', 'CmdOrCtrl+0'),
    cmd('heading1', '一级标题', 'CmdOrCtrl+1'),
    cmd('heading2', '二级标题', 'CmdOrCtrl+2'),
    cmd('heading3', '三级标题', 'CmdOrCtrl+3'),
    cmd('heading4', '四级标题', 'CmdOrCtrl+4'),
    cmd('heading5', '五级标题', 'CmdOrCtrl+5'),
    cmd('heading6', '六级标题', 'CmdOrCtrl+6'),
    cmd('headingIncrease', '提升标题级别', 'CmdOrCtrl+='),
    cmd('headingDecrease', '降低标题级别', 'CmdOrCtrl+-'),
    { type: 'separator' },
    cmd('insertTable', '表格', 'CmdOrCtrl+T'),
    cmd('codeBlock', '代码块', 'CmdOrCtrl+Shift+K'),
    cmd('mathBlock', '公式块', 'CmdOrCtrl+Shift+M'),
    cmd('blockquote', '引用', 'CmdOrCtrl+Shift+Q'),
    cmd('orderedList', '有序列表', 'CmdOrCtrl+Shift+['),
    cmd('bulletList', '无序列表', 'CmdOrCtrl+Shift+]'),
    cmd('taskList', '任务列表'),
    {
      type: 'submenu',
      id: 'taskStatus',
      label: '任务状态',
      items: [
        cmd('taskToggle', '切换任务状态'),
        cmd('taskComplete', '标记为已完成'),
        cmd('taskIncomplete', '标记为未完成')
      ]
    },
    {
      type: 'submenu',
      id: 'listIndent',
      label: '列表缩进',
      items: [
        cmd('indent', '增加缩进', 'CmdOrCtrl+['),
        cmd('outdent', '减少缩进', 'CmdOrCtrl+]')
      ]
    },
    { type: 'separator' },
    cmd('linkReference', '链接引用'),
    cmd('footnote', '脚注'),
    cmd('horizontalRule', '水平分割线'),
    cmd('toc', '内容目录'),
    cmd('yamlFrontMatter', 'YAML Front Matter'),
    cmd('htmlBlock', 'HTML 内容'),
    cmd('deleteBlock', '删除块')
  ]
}

export function buildFormatMenuSpecs(): EditorMenuItemSpec[] {
  return [
    cmd('bold', '加粗', 'CmdOrCtrl+B'),
    cmd('italic', '斜体', 'CmdOrCtrl+I'),
    cmd('underline', '下划线', 'CmdOrCtrl+U'),
    cmd('inlineCode', '代码', 'CmdOrCtrl+Shift+`'),
    cmd('inlineMath', '内联公式'),
    cmd('strike', '删除线', 'Alt+Shift+5'),
    cmd('highlight', '高亮'),
    cmd('superscript', '上标'),
    cmd('subscript', '下标'),
    cmd('comment', '注释'),
    { type: 'separator' },
    cmd('link', '超链接', 'CmdOrCtrl+K'),
    cmd('image', '图像', 'CmdOrCtrl+Shift+I'),
    { type: 'separator' },
    cmd('clearFormat', '清除样式', 'CmdOrCtrl+\\')
  ]
}

function headingLevel(editor: Editor): number | null {
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive('heading', { level })) return level
  }
  return null
}

export function applyEditorMenuAction(editor: Editor, action: MenuActionName): boolean {
  const chain = () => editor.chain().focus()
  switch (action) {
    case 'paragraph':
      return chain().setParagraph().run()
    case 'heading1':
      return chain().toggleHeading({ level: 1 }).run()
    case 'heading2':
      return chain().toggleHeading({ level: 2 }).run()
    case 'heading3':
      return chain().toggleHeading({ level: 3 }).run()
    case 'heading4':
      return chain().toggleHeading({ level: 4 }).run()
    case 'heading5':
      return chain().toggleHeading({ level: 5 }).run()
    case 'heading6':
      return chain().toggleHeading({ level: 6 }).run()
    case 'headingIncrease': {
      const level = headingLevel(editor)
      if (level == null) return chain().toggleHeading({ level: 6 }).run()
      if (level <= 1) return true
      return chain().toggleHeading({ level: (level - 1) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
    }
    case 'headingDecrease': {
      const level = headingLevel(editor)
      if (level == null) return false
      if (level >= 6) return chain().setParagraph().run()
      return chain().toggleHeading({ level: (level + 1) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
    }
    case 'insertTable':
      return chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    case 'image': {
      const src = window.prompt('图片 URL', 'https://')
      if (src === null || src.trim() === '') return false
      const alt = window.prompt('图片描述（可选）', '') ?? ''
      return chain().setImage({ src: src.trim(), alt: alt.trim() }).run()
    }
    case 'codeBlock':
      return chain().toggleCodeBlock().run()
    case 'mathBlock': {
      const expression = window.prompt('LaTeX 公式', 'E = mc^2')
      if (expression === null || expression.trim() === '') return false
      // `$$` fenced math stays verbatim as paragraph text through the
      // roundtrip; full KaTeX rendering is a separate, heavier dependency.
      return insertMarkdown(editor, `$$\n${expression.trim()}\n$$\n`)
    }
    case 'blockquote':
      return chain().toggleBlockquote().run()
    case 'orderedList':
      return chain().toggleOrderedList().run()
    case 'bulletList':
      return chain().toggleBulletList().run()
    case 'taskList':
      return chain().toggleTaskList().run()
    case 'taskToggle': {
      const checked = Boolean(editor.getAttributes('taskItem').checked)
      return editor.commands.updateAttributes('taskItem', { checked: !checked })
    }
    case 'taskComplete':
      return editor.commands.updateAttributes('taskItem', { checked: true })
    case 'taskIncomplete':
      return editor.commands.updateAttributes('taskItem', { checked: false })
    case 'indent':
      return (
        chain().sinkListItem('listItem').run() || chain().sinkListItem('taskItem').run()
      )
    case 'outdent':
      return (
        chain().liftListItem('listItem').run() || chain().liftListItem('taskItem').run()
      )
    case 'horizontalRule':
      return chain().setHorizontalRule().run()
    case 'linkReference': {
      const text = window.prompt('链接文字')
      if (text === null || text.trim() === '') return false
      const href = window.prompt('链接 URL', 'https://')
      if (href === null || href.trim() === '') return false
      // Editor normalizes reference-style links to inline links: the href is
      // preserved, while a separate definition block would be dropped by
      // markdown-it on parse. See docs, "known normalizations".
      return insertMarkdown(editor, `[${text.trim()}](${href.trim()})`)
    }
    case 'footnote': {
      const label = window.prompt('脚注编号', '1')
      if (label === null || label.trim() === '') return false
      const note = window.prompt('脚注内容')
      if (note === null || note.trim() === '') return false
      return insertMarkdown(editor, `[^${label.trim()}]\n\n[^${label.trim()}]: ${note.trim()}\n`)
    }
    case 'toc': {
      const lines: string[] = []
      // One slugger for the whole walk so duplicate headings get stable
      // -1/-2 suffixes that match the anchors written on HTML export.
      const slug = createHeadingSlugger()
      editor.state.doc.descendants((node) => {
        if (node.type.name !== 'heading') return
        const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1
        const title = node.textContent.trim()
        if (title === '') return
        const anchor = slug(title)
        const label = title.replace(/([\[\]])/g, '\\$1')
        lines.push(`${'  '.repeat(Math.max(0, Math.min(6, level) - 1))}- [${label}](#${anchor})`)
      })
      if (lines.length === 0) return false
      return insertMarkdown(editor, `${lines.join('\n')}\n`)
    }
    case 'yamlFrontMatter': {
      const title = window.prompt('文档标题（YAML title）', '')
      if (title === null) return false
      const tags = window.prompt('标签（逗号分隔，可留空）', '') ?? ''
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .join(', ')
      const source = `---\ntitle: ${title.trim()}\ntags: [${tagList}]\n---\n`
      const first = editor.state.doc.firstChild
      if (first?.type.name === 'frontMatter') {
        return chain()
          .deleteRange({ from: 0, to: first.nodeSize })
          .insertContentAt(0, source)
          .run()
      }
      return insertMarkdownAt(editor, 0, source)
    }
    case 'htmlBlock': {
      const html = window.prompt('HTML 内容', '<div class="note">\n  内容\n</div>')
      if (html === null || html.trim() === '') return false
      // Raw HTML would be stripped to its text content by the editor schema;
      // a fenced block keeps the source byte-for-byte and stays editable.
      return insertMarkdown(editor, `\`\`\`html\n${html.trim()}\n\`\`\`\n`)
    }
    case 'deleteBlock': {
      const { $from } = editor.state.selection
      if ($from.depth === 0) return false
      const from = $from.before(1)
      const to = $from.after(1)
      return chain().deleteRange({ from, to }).run()
    }
    case 'bold':
      return chain().toggleBold().run()
    case 'italic':
      return chain().toggleItalic().run()
    case 'underline':
      return chain().toggleUnderline().run()
    case 'inlineCode':
      return chain().toggleCode().run()
    case 'strike':
      return chain().toggleStrike().run()
    case 'highlight':
      return chain().toggleHighlight().run()
    case 'superscript':
      return chain().toggleSuperscript().run()
    case 'subscript':
      return chain().toggleSubscript().run()
    case 'inlineMath': {
      const expression = window.prompt('LaTeX 行内公式', 'x^2')
      if (expression === null || expression.trim() === '') return false
      return insertMarkdown(editor, `$${expression.trim()}$`)
    }
    case 'comment': {
      const text = window.prompt('注释内容')
      if (text === null || text.trim() === '') return false
      // HTML comments are not part of the editor schema; keep them verbatim
      // in a fenced block instead of letting the parser drop them.
      return insertMarkdown(editor, `\`\`\`text\n<!-- ${text.trim()} -->\n\`\`\`\n`)
    }
    case 'link': {
      const prev = editor.getAttributes('link').href as string | undefined
      const href = window.prompt('链接 URL', prev ?? 'https://')
      if (href === null) return false
      if (href.trim() === '') return chain().unsetLink().run()
      return chain().extendMarkRange('link').setLink({ href: href.trim() }).run()
    }
    case 'clearFormat':
      return chain().unsetAllMarks().run()
    default:
      return false
  }
}
