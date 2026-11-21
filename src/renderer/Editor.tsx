import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useEditor, EditorContent, Extension, type Editor as TiptapEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { createMarkdownExtensions } from '../shared/md-extensions'
import { CurrentBlockMarkdown, MarkdownSource } from './extensions/CurrentBlockMarkdown'
import { AnchorJump } from './extensions/AnchorJump'
import { DocumentSearch } from './extensions/DocumentSearch'
import { WritingMode } from './extensions/WritingMode'
import { AutoPair } from './extensions/AutoPair'
import FindBar, { type FindMode } from './FindBar'
import { collectText, countWords, type WordStats } from '../shared/word-count'

export type EditorProps = {
  content: string
  onChangeMarkdown: (markdown: string) => void
  onDirty?: () => void
  onWikiLink?: (target: string) => void
  onStats?: (stats: WordStats) => void
  focusMode?: boolean
  typewriterMode?: boolean
}

export type WritingModeHandle = {
  setFocusMode: (value: boolean) => void
  setTypewriterMode: (value: boolean) => void
}

export type EditorHandle = WritingModeHandle & {
  getEditor: () => TiptapEditor | null
  jumpToHeading: (index: number) => boolean
  openFind: (mode?: FindMode) => void
  closeFind: () => void
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
const HeadingShortcuts = Extension.create<{ onFind?: () => void }>({
  name: 'headingShortcuts',
  addOptions() {
    return { onFind: undefined }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-1': () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      'Mod-2': () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      'Mod-3': () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      'Mod-f': () => {
        this.options.onFind?.()
        return true
      }
    }
  }
})

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { content, onChangeMarkdown, onDirty, onWikiLink, onStats, focusMode = false, typewriterMode = false },
  ref
): JSX.Element {
  const onChangeRef = useRef(onChangeMarkdown)
  const onDirtyRef = useRef(onDirty)
  const onWikiLinkRef = useRef(onWikiLink)
  const onStatsRef = useRef(onStats)
  const lastEmittedRef = useRef(content)
  const [findOpen, setFindOpen] = useState(false)
  const [findMode, setFindMode] = useState<FindMode>('find')

  const emitStats = (ed: TiptapEditor) => {
    onStatsRef.current?.(countWords(collectText(ed.state.doc)))
  }

  const openFind = (mode: FindMode = 'find') => {
    setFindMode(mode)
    setFindOpen(true)
  }
  const closeFind = () => setFindOpen(false)

  onChangeRef.current = onChangeMarkdown
  onDirtyRef.current = onDirty
  onWikiLinkRef.current = onWikiLink
  onStatsRef.current = onStats

  const editor = useEditor({
    extensions: [
      ...createMarkdownExtensions(),
      HeadingShortcuts.configure({ onFind: () => openFind('find') }),
      Placeholder.configure({
        placeholder: '开始写作…'
      }),
      DocumentSearch,
      WritingMode,
      AutoPair,
      MarkdownSource,
      CurrentBlockMarkdown,
      AnchorJump.configure({
        onWikiLink: (target) => onWikiLinkRef.current?.(target)
      })
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
      emitStats(ed)
    }
  })

  // Push initial stats once the editor is created (covers file open / new tab).
  useEffect(() => {
    if (editor) emitStats(editor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const setFocusMode = useCallback((value: boolean) => {
    editor?.commands.setFocusMode(value)
  }, [editor])
  const setTypewriterMode = useCallback((value: boolean) => {
    editor?.commands.setTypewriterMode(value)
  }, [editor])

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editor,
      jumpToHeading: (index: number) => jumpToHeading(editor, index),
      openFind,
      closeFind,
      setFocusMode,
      setTypewriterMode
    }),
    [editor, setFocusMode, setTypewriterMode]
  )

  // Sync writing-mode props from persisted prefs into the editor plugin.
  useEffect(() => {
    if (editor) editor.commands.setFocusMode(focusMode)
  }, [editor, focusMode])
  useEffect(() => {
    if (editor) editor.commands.setTypewriterMode(typewriterMode)
  }, [editor, typewriterMode])

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
    emitStats(editor)
  }, [content, editor])

  return (
    <div className="editor">
      {findOpen && (
        <FindBar
          editor={editor}
          mode={findMode}
          onModeChange={setFindMode}
          onClose={closeFind}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  )
})

export default Editor
