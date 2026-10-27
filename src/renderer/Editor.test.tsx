/** @vitest-environment happy-dom */
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Editor, { type EditorHandle } from './Editor'
import type { Editor as TiptapEditor } from '@tiptap/react'

/** Simulate real typing so TipTap/ProseMirror input rules can fire. */
function typeText(editor: TiptapEditor, text: string): void {
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

function topLevelTypes(editor: TiptapEditor): string[] {
  return [...Array(editor.state.doc.childCount)].map((_, i) => editor.state.doc.child(i).type.name)
}

function focusMarkers(editor: TiptapEditor): Element[] {
  return [...editor.view.dom.querySelectorAll('.md-marker')]
}

describe('Editor', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // React act() support under Vitest/happy-dom
    // @ts-expect-error vitest global
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders markdown content as live typography', async () => {
    await act(async () => {
      root.render(<Editor content="# Hello" onChangeMarkdown={() => {}} />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    const heading = container.querySelector('h1')
    expect(heading?.textContent).toBe('Hello')
  })

  it('calls onChangeMarkdown and onDirty when the document is edited', async () => {
    const onChangeMarkdown = vi.fn()
    const onDirty = vi.fn()
    const handle = createRef<EditorHandle>()

    await act(async () => {
      root.render(
        <Editor
          ref={handle}
          content="hello"
          onChangeMarkdown={onChangeMarkdown}
          onDirty={onDirty}
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    const editor = handle.current?.getEditor()
    expect(editor).toBeTruthy()

    await act(async () => {
      // setContent emitUpdate=true triggers onUpdate (default is false)
      editor!.commands.setContent('world', true)
    })

    expect(onChangeMarkdown).toHaveBeenCalled()
    const lastMd = onChangeMarkdown.mock.calls.at(-1)?.[0] as string
    expect(lastMd).toContain('world')
    expect(onDirty).toHaveBeenCalled()
  })

  it('toggles bold and italic via Mod-b / Mod-i', async () => {
    const handle = createRef<EditorHandle>()

    await act(async () => {
      root.render(<Editor ref={handle} content="hello" onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const editor = handle.current?.getEditor()
    expect(editor).toBeTruthy()

    await act(async () => {
      editor!.commands.selectAll()
      editor!.commands.keyboardShortcut('Mod-b')
    })
    expect(editor!.isActive('bold')).toBe(true)

    await act(async () => {
      editor!.commands.keyboardShortcut('Mod-i')
    })
    expect(editor!.isActive('italic')).toBe(true)
  })

  it('toggles heading levels via Mod-1 / Mod-2 / Mod-3', async () => {
    const handle = createRef<EditorHandle>()

    await act(async () => {
      root.render(<Editor ref={handle} content="hello" onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const editor = handle.current?.getEditor()
    expect(editor).toBeTruthy()

    await act(async () => {
      editor!.commands.selectAll()
      editor!.commands.keyboardShortcut('Mod-1')
    })
    expect(editor!.isActive('heading', { level: 1 })).toBe(true)

    await act(async () => {
      editor!.commands.keyboardShortcut('Mod-2')
    })
    expect(editor!.isActive('heading', { level: 2 })).toBe(true)

    await act(async () => {
      editor!.commands.keyboardShortcut('Mod-3')
    })
    expect(editor!.isActive('heading', { level: 3 })).toBe(true)
  })

  it('jumpToHeading moves caret to heading by index and returns false for OOB', async () => {
    const handle = createRef<EditorHandle>()

    await act(async () => {
      root.render(
        <Editor
          ref={handle}
          content={'# One\n\n## Two\n\ntext'}
          onChangeMarkdown={() => {}}
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(handle.current?.jumpToHeading).toBeTypeOf('function')

    let ok: boolean | undefined
    await act(async () => {
      ok = handle.current!.jumpToHeading(1)
    })
    expect(ok).toBe(true)

    const editor = handle.current!.getEditor()
    expect(editor).toBeTruthy()
    // Hybrid: jumped-to heading stays rendered (no markdownSource swap)
    expect(editor!.state.doc.child(1)?.type.name).toBe('heading')
    expect(editor!.state.doc.child(1)?.textContent).toBe('Two')
    expect(topLevelTypes(editor!)).not.toContain('markdownSource')
    expect(editor!.view.dom.querySelector('pre.markdown-source')).toBeNull()

    let oob: boolean | undefined
    await act(async () => {
      oob = handle.current!.jumpToHeading(99)
    })
    expect(oob).toBe(false)
  })

  it('keeps focused heading rendered — does not enter markdownSource', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={() => {}} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Hello')
    expect(editor.state.doc.child(1)?.type.name).toBe('paragraph')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
    expect(editor.view.dom.querySelector('pre.markdown-source')).toBeNull()
  })

  it('shows md-marker decorations on focused heading', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={() => {}} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    const markers = focusMarkers(editor)
    expect(markers.length).toBeGreaterThan(0)
    expect(markers.some((el) => /#/.test(el.textContent ?? ''))).toBe(true)
  })

  it('keeps both blocks rendered when focus moves to another block', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={() => {}} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    await act(async () => {
      const paraPos = editor.state.doc.firstChild!.nodeSize + 1
      editor.commands.setTextSelection(paraPos + 1)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.child(1)?.type.name).toBe('paragraph')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('clears focus state when parent replaces content', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={() => {}} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'## Other\n'} onChangeMarkdown={() => {}} />
      )
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Other')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('does not insert markdownSource while composing', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={() => {}} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    Object.defineProperty(editor.view, 'composing', {
      configurable: true,
      get: () => true
    })
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('supports underline highlight and taskList commands', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(<Editor ref={handle} content="hello" onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.selectAll()
      editor.commands.toggleUnderline()
      editor.commands.toggleHighlight()
    })
    expect(editor.isActive('underline')).toBe(true)
    expect(editor.isActive('highlight')).toBe(true)
    await act(async () => {
      editor.commands.toggleTaskList()
    })
    expect(editor.isActive('taskList')).toBe(true)
  })

  it('jumpToHeading index stays correct with earlier heading focused (still rendered)', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor
          ref={handle}
          content={'# One\n\n## Two\n\n### Three\n'}
          onChangeMarkdown={() => {}}
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')

    let ok: boolean | undefined
    await act(async () => {
      ok = handle.current!.jumpToHeading(1)
      await Promise.resolve()
    })
    expect(ok).toBe(true)
    // Index 1 is ## Two — stays rendered heading
    expect(editor.state.doc.child(1)?.type.name).toBe('heading')
    expect(editor.state.doc.child(1)?.textContent).toBe('Two')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('onChangeMarkdown stays valid markdown while a block is focused', async () => {
    const onChangeMarkdown = vi.fn()
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(
        <Editor ref={handle} content={'# Hello\n\nworld\n'} onChangeMarkdown={onChangeMarkdown} />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    onChangeMarkdown.mockClear()
    await act(async () => {
      editor.commands.setTextSelection(2)
      await Promise.resolve()
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    const md = editor.storage.markdown.getMarkdown() as string
    expect(md).not.toMatch(/<pre\b/i)
    expect(md).not.toMatch(/markdown-source/)
    if (onChangeMarkdown.mock.calls.length > 0) {
      const last = onChangeMarkdown.mock.calls.at(-1)?.[0] as string
      expect(last).not.toMatch(/<pre\b/i)
      expect(last).not.toMatch(/markdown-source/)
    }
  })

  it('typing **bold** converts immediately without leaving the block', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(<Editor ref={handle} content="hello" onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.selectAll()
      editor.commands.deleteSelection()
      typeText(editor, '**bold**')
    })
    expect(editor.getHTML()).toMatch(/<(strong|b)>bold<\/(strong|b)>/)
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })

  it('typing # space converts to heading immediately', async () => {
    const handle = createRef<EditorHandle>()
    await act(async () => {
      root.render(<Editor ref={handle} content="hello" onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const editor = handle.current!.getEditor()!
    await act(async () => {
      editor.commands.selectAll()
      editor.commands.deleteSelection()
      typeText(editor, '# Hello')
    })
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Hello')
    expect(topLevelTypes(editor)).not.toContain('markdownSource')
  })
})
