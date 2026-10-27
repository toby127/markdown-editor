import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent, Extension, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { CurrentBlockMarkdown, MarkdownSource } from './extensions/CurrentBlockMarkdown'

export type EditorProps = {
  content: string
  onChangeMarkdown: (markdown: string) => void
  onDirty?: () => void
}

export type EditorHandle = {
  getEditor: () => TiptapEditor | null
  jumpToHeading: (index: number) => boolean
}

const ATX_HEADING_SOURCE = /^#{1,6}\s/

function isOutlineHeading(node: { type: { name: string }; textContent: string }): boolean {
  if (node.type.name === 'heading') return true
  if (node.type.name === 'markdownSource' && ATX_HEADING_SOURCE.test(node.textContent)) return true
  return false
}

function jumpToHeading(editor: TiptapEditor | null, index: number): boolean {
  if (!editor || index < 0) return false
  let i = 0
  let targetPos: number | null = null
  // descendants() still walks siblings after return false — guard so we don't overwrite.
  editor.state.doc.descendants((node, pos) => {
    if (targetPos != null) return false
    if (!isOutlineHeading(node)) return true
    if (i === index) {
      targetPos = pos + 1
      return false
    }
    i += 1
    return true
  })
  if (targetPos == null) return false
  editor.chain().focus().setTextSelection(targetPos).run()
  const dom = editor.view.domAtPos(targetPos)
  const el =
    (dom.node as HTMLElement).closest?.('h1,h2,h3,h4,h5,h6') ??
    (dom.node.parentElement as HTMLElement | null)
  el?.scrollIntoView({ block: 'start' })
  return true
}

/** TipTap Heading defaults to Mod-Alt-N; bind Mod-1..3 for common heading shortcuts. */
const HeadingShortcuts = Extension.create({
  name: 'headingShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-1': () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      'Mod-2': () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      'Mod-3': () => this.editor.chain().focus().toggleHeading({ level: 3 }).run()
    }
  }
})

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { content, onChangeMarkdown, onDirty },
  ref
): JSX.Element {
  const onChangeRef = useRef(onChangeMarkdown)
  const onDirtyRef = useRef(onDirty)
  const lastEmittedRef = useRef(content)

  onChangeRef.current = onChangeMarkdown
  onDirtyRef.current = onDirty

  const editor = useEditor({
    extensions: [
      StarterKit,
      HeadingShortcuts,
      Link.configure({ openOnClick: false }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: '开始写作…'
      }),
      // html: true — required for tiptap-markdown setContent/getMarkdown (see Task 2)
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true
      }),
      MarkdownSource,
      CurrentBlockMarkdown
    ],
    content,
    editorProps: {
      attributes: {
        class: 'editor-content'
      }
    },
    onUpdate: ({ editor: ed }) => {
      const markdown = ed.storage.markdown.getMarkdown() as string
      lastEmittedRef.current = markdown
      onChangeRef.current(markdown)
      onDirtyRef.current?.()
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      jumpToHeading: (index: number) => jumpToHeading(editor, index)
    }),
    [editor]
  )

  // Sync when parent replaces content (e.g. file open); skip echo of our own emits.
  useEffect(() => {
    if (!editor) return
    if (content === lastEmittedRef.current) return
    lastEmittedRef.current = content
    const view = editor.view
    const prev = Object.getOwnPropertyDescriptor(view, 'composing')
    Object.defineProperty(view, 'composing', {
      configurable: true,
      get: () => true
    })
    try {
      editor.commands.setContent(content)
    } finally {
      if (prev) Object.defineProperty(view, 'composing', prev)
      else delete (view as { composing?: boolean }).composing
    }
  }, [content, editor])

  return (
    <div className="editor">
      <EditorContent editor={editor} />
    </div>
  )
})

export default Editor
