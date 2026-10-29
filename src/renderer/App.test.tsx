/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MarkdownEditorApi, MenuAction } from '../shared/ipc'
import { RECENTS_STORAGE_KEY } from '../shared/recents'
import App from './App'

type EditorStubProps = {
  content: string
  onChangeMarkdown: (md: string) => void
  onDirty?: () => void
}

let latestEditorProps: EditorStubProps | null = null
let editorStubReturnsEditor = true

const { applyEditorMenuActionMock } = vi.hoisted(() => ({
  applyEditorMenuActionMock: vi.fn(() => true)
}))

vi.mock('../shared/editor-menu', async () => {
  const actual = await vi.importActual<typeof import('../shared/editor-menu')>(
    '../shared/editor-menu'
  )
  return {
    ...actual,
    applyEditorMenuAction: (...args: unknown[]) => applyEditorMenuActionMock(...args)
  }
})

vi.mock('./Editor', async () => {
  const React = await import('react')
  const stubEditor = { stub: true }
  return {
    default: React.forwardRef(function EditorStub(
      props: EditorStubProps,
      ref: React.ForwardedRef<{ jumpToHeading: (i: number) => boolean; getEditor: () => unknown }>
    ) {
      latestEditorProps = props
      React.useImperativeHandle(ref, () => ({
        jumpToHeading: () => false,
        getEditor: () => (editorStubReturnsEditor ? stubEditor : null)
      }))
      return <div data-testid="editor">{props.content}</div>
    })
  }
})

describe('App file workflow', () => {
  let container: HTMLDivElement
  let root: Root
  let api: MarkdownEditorApi
  let menuHandler: ((action: MenuAction) => void) | null
  let requestCloseHandler: (() => void) | null
  let openPathsHandler: ((paths: string[]) => void) | null
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let promptSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // @ts-expect-error vitest global
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.removeItem(RECENTS_STORAGE_KEY)
    menuHandler = null
    requestCloseHandler = null
    openPathsHandler = null
    latestEditorProps = null
    editorStubReturnsEditor = true

    api = {
      openFile: vi.fn(async () => ({ ok: false as const, canceled: true as const })),
      saveFile: vi.fn(async () => ({ ok: false as const, canceled: true as const })),
      saveFileAs: vi.fn(async () => ({ ok: false as const, canceled: true as const })),
      setDirty: vi.fn(async () => undefined),
      closeWindow: vi.fn(async () => undefined),
      onMenuAction: vi.fn((handler: (action: MenuAction) => void) => {
        menuHandler = handler
        return () => {
          menuHandler = null
        }
      }),
      openFolder: vi.fn(async () => ({ ok: false as const, canceled: true as const })),
      listDir: vi.fn(async () => ({ ok: false as const, error: 'stub' })),
      readFile: vi.fn(async () => ({ ok: false as const, error: 'stub' })),
      createEntry: vi.fn(async () => ({ ok: false as const, error: 'stub' })),
      renameEntry: vi.fn(async () => ({ ok: false as const, error: 'stub' })),
      deleteEntry: vi.fn(async () => ({ ok: false as const, error: 'stub' })),
      onOpenPaths: vi.fn((handler: (paths: string[]) => void) => {
        openPathsHandler = handler
        return () => {
          openPathsHandler = null
        }
      }),
      getPathForFile: vi.fn((file: File) => (file as File & { path?: string }).path ?? ''),
      confirmSave: vi.fn(async () => 'cancel' as const),
      onRequestClose: vi.fn((handler: () => void) => {
        requestCloseHandler = handler
        return () => {
          requestCloseHandler = null
        }
      }),
      abortClose: vi.fn(async () => undefined),
      syncMenuState: vi.fn(async () => undefined),
      getSidebarWidth: vi.fn(async () => 220),
      setSidebarWidth: vi.fn(async (width: number) => width)
    }
    window.api = api

    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    confirmSpy.mockRestore()
    promptSpy.mockRestore()
    alertSpy.mockRestore()
  })

  async function renderApp(): Promise<void> {
    await act(async () => {
      root.render(<App />)
    })
  }

  async function simulateEdit(markdown: string): Promise<void> {
    await act(async () => {
      latestEditorProps?.onChangeMarkdown(markdown)
      latestEditorProps?.onDirty?.()
    })
  }

  it('subscribes to menu actions and opens a file into the editor', async () => {
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/tmp/sample.md',
      content: '# Sample\n'
    })

    await renderApp()
    expect(api.onMenuAction).toHaveBeenCalled()

    await act(async () => {
      menuHandler?.({ action: 'open' })
      await Promise.resolve()
    })

    expect(api.openFile).toHaveBeenCalled()
    expect(latestEditorProps?.content).toBe('# Sample\n')
    expect(api.setDirty).toHaveBeenCalledWith(false)
  })

  it('opens a file as another tab without discarding dirty content', async () => {
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/tmp/sample.md',
      content: '# Sample\n'
    })
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('edited')

    await act(async () => {
      menuHandler?.({ action: 'open' })
      await Promise.resolve()
    })

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(api.openFile).toHaveBeenCalled()
    expect(latestEditorProps?.content).toBe('# Sample\n')
    // Dirty tab still open → window dirty remains true
    expect(api.setDirty).toHaveBeenCalledWith(true)
  })

  it('saves current path content and clears dirty', async () => {
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/tmp/sample.md',
      content: '# Sample\n'
    })
    vi.mocked(api.saveFile).mockResolvedValue({ ok: true, path: '/tmp/sample.md' })

    await renderApp()

    await act(async () => {
      menuHandler?.({ action: 'open' })
      await Promise.resolve()
    })

    await simulateEdit('# Sample\nedited\n')

    await act(async () => {
      menuHandler?.({ action: 'save' })
      await Promise.resolve()
    })

    expect(api.saveFile).toHaveBeenCalledWith({
      path: '/tmp/sample.md',
      content: '# Sample\nedited\n'
    })
    expect(api.setDirty).toHaveBeenCalledWith(false)
    expect(api.closeWindow).toHaveBeenCalled()
  })

  it('saveAs updates path on success', async () => {
    vi.mocked(api.saveFileAs).mockResolvedValue({ ok: true, path: '/tmp/other.md' })
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })

    await act(async () => {
      menuHandler?.({ action: 'saveAs' })
      await Promise.resolve()
    })

    expect(api.saveFileAs).toHaveBeenCalled()
    expect(api.setDirty).toHaveBeenCalledWith(false)
    expect(api.closeWindow).toHaveBeenCalled()

    vi.mocked(api.saveFile).mockResolvedValue({ ok: true, path: '/tmp/other.md' })
    await act(async () => {
      menuHandler?.({ action: 'save' })
      await Promise.resolve()
    })
    expect(api.saveFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/tmp/other.md' })
    )
  })

  it('new opens an untitled tab without discard confirm', async () => {
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('dirty text')

    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(latestEditorProps?.content).toBe('')
    expect(api.setDirty).toHaveBeenLastCalledWith(true)
  })

  it('alerts on save error', async () => {
    vi.mocked(api.saveFile).mockResolvedValue({ ok: false, error: '保存失败：EACCES' })
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })

    await act(async () => {
      menuHandler?.({ action: 'save' })
      await Promise.resolve()
    })

    expect(alertSpy).toHaveBeenCalledWith('保存失败：EACCES')
    expect(api.closeWindow).not.toHaveBeenCalled()
  })

  it('does not close window when save is canceled', async () => {
    vi.mocked(api.saveFile).mockResolvedValue({ ok: false, canceled: true })
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })

    await act(async () => {
      menuHandler?.({ action: 'save' })
      await Promise.resolve()
    })

    expect(api.closeWindow).not.toHaveBeenCalled()
  })

  it('uses confirmSave before closing a dirty tab and cancels', async () => {
    vi.mocked(api.confirmSave).mockResolvedValue('cancel')
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('dirty text')

    const closeBtn = container.querySelector(
      'button[aria-label="关闭 未命名"]'
    ) as HTMLButtonElement
    expect(closeBtn).toBeTruthy()

    await act(async () => {
      closeBtn.click()
      await Promise.resolve()
    })

    expect(api.confirmSave).toHaveBeenCalled()
    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeTruthy()
  })

  it('openFolder sets workspace tree from listDir', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [
        { name: 'a.md', path: '/ws/a.md', kind: 'file' },
        { name: 'sub', path: '/ws/sub', kind: 'directory' }
      ]
    })

    await renderApp()
    expect(container.querySelector('.app-shell')).toBeTruthy()
    expect(container.textContent).toContain('打开文件夹')

    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    expect(api.openFolder).toHaveBeenCalled()
    expect(api.listDir).toHaveBeenCalledWith('/ws')
    expect(container.textContent).toContain('a.md')
    expect(container.textContent).toContain('sub')
  })

  it('tree file click opens tab via readFile without changing root', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' }]
    })
    vi.mocked(api.readFile).mockResolvedValue({
      ok: true,
      content: '# From tree\n'
    })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    const listCallsBefore = vi.mocked(api.listDir).mock.calls.length

    const fileBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    expect(fileBtn).toBeTruthy()

    await act(async () => {
      fileBtn.click()
      await Promise.resolve()
    })

    expect(api.readFile).toHaveBeenCalledWith('/ws/a.md')
    expect(latestEditorProps?.content).toBe('# From tree\n')
    // Root stays; no re-list of workspace from tree click
    expect(vi.mocked(api.listDir).mock.calls.length).toBe(listCallsBefore)
    expect(container.textContent).toContain('a.md')
  })

  it('empty-state open folder button calls openFolder', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/proj' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })

    await renderApp()
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '打开文件夹'
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()

    await act(async () => {
      btn.click()
      await Promise.resolve()
    })

    expect(api.openFolder).toHaveBeenCalled()
    expect(api.listDir).toHaveBeenCalledWith('/proj')
  })

  it('creates a file via File menu newFile and refreshes listDir', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' }]
    })
    vi.mocked(api.createEntry).mockResolvedValue({ ok: true, path: '/ws/note.md' })
    promptSpy.mockReturnValue('note.md')

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    await act(async () => {
      menuHandler?.({ action: 'newFile' })
      await Promise.resolve()
    })

    expect(api.createEntry).toHaveBeenCalledWith({
      parentPath: '/ws',
      name: 'note.md',
      kind: 'file'
    })
    expect(api.listDir).toHaveBeenCalledWith('/ws')
  })

  it('renames a file and updates the open tab title', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' }]
    })
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# A\n' })
    vi.mocked(api.renameEntry).mockResolvedValue({ ok: true, path: '/ws/b.md' })
    promptSpy.mockReturnValue('b.md')

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    const fileBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    await act(async () => {
      fileBtn.click()
      await Promise.resolve()
    })

    const fileRow = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    expect(fileRow).toBeTruthy()

    await act(async () => {
      fireEvent.contextMenu(fileRow)
      await Promise.resolve()
    })
    const renameItem = Array.from(container.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent === '重命名'
    ) as HTMLElement
    expect(renameItem).toBeTruthy()

    await act(async () => {
      fireEvent.click(renameItem)
      await Promise.resolve()
    })

    expect(api.renameEntry).toHaveBeenCalledWith({ path: '/ws/a.md', newName: 'b.md' })
    expect(container.textContent).toContain('b.md')
  })

  it('prompts confirmSave for dirty tab before delete and aborts on cancel', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' }]
    })
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# A\n' })
    vi.mocked(api.confirmSave).mockResolvedValue('cancel')
    confirmSpy.mockReturnValue(true)

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })
    const fileBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    await act(async () => {
      fileBtn.click()
      await Promise.resolve()
    })
    await simulateEdit('edited')

    const fileRow = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    expect(fileRow).toBeTruthy()

    await act(async () => {
      fireEvent.contextMenu(fileRow)
      await Promise.resolve()
    })
    const delItem = Array.from(container.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent === '删除'
    ) as HTMLElement
    expect(delItem).toBeTruthy()

    await act(async () => {
      fireEvent.click(delItem)
      await Promise.resolve()
    })

    expect(api.confirmSave).toHaveBeenCalled()
    expect(api.deleteEntry).not.toHaveBeenCalled()
  })

  it('handles requestClose by confirming each dirty tab then closeWindow', async () => {
    vi.mocked(api.confirmSave).mockResolvedValue('discard')
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('dirty')

    expect(api.onRequestClose).toHaveBeenCalled()

    await act(async () => {
      requestCloseHandler?.()
      await Promise.resolve()
    })

    expect(api.confirmSave).toHaveBeenCalled()
    expect(api.setDirty).toHaveBeenCalledWith(false)
    expect(api.closeWindow).toHaveBeenCalled()
  })

  it('aborts requestClose when confirmSave returns cancel', async () => {
    vi.mocked(api.confirmSave).mockResolvedValue('cancel')
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('dirty')

    await act(async () => {
      requestCloseHandler?.()
      await Promise.resolve()
    })

    expect(api.abortClose).toHaveBeenCalled()
    expect(api.closeWindow).not.toHaveBeenCalled()
  })

  it('keeps dirty flags when requestClose discard is followed by cancel', async () => {
    vi.mocked(api.confirmSave)
      .mockResolvedValueOnce('discard')
      .mockResolvedValueOnce('cancel')

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('first dirty')

    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await simulateEdit('second dirty')

    expect(container.querySelectorAll('.tab-dirty')).toHaveLength(2)

    await act(async () => {
      requestCloseHandler?.()
      await Promise.resolve()
    })

    expect(api.confirmSave).toHaveBeenCalledTimes(2)
    expect(api.abortClose).toHaveBeenCalled()
    expect(api.closeWindow).not.toHaveBeenCalled()
    // Both tabs must still look dirty so a later close prompts again
    expect(container.querySelectorAll('.tab-dirty')).toHaveLength(2)
    expect(api.setDirty).toHaveBeenLastCalledWith(true)
  })

  it('onOpenPaths opens markdown files and sets workspace root from first', async () => {
    vi.mocked(api.readFile).mockImplementation(async (filePath: string) => {
      if (filePath === '/ws/a.md') return { ok: true as const, content: '# A\n' }
      if (filePath === '/ws/sub/b.md') return { ok: true as const, content: '# B\n' }
      return { ok: false as const, error: 'missing' }
    })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })

    await renderApp()
    expect(api.onOpenPaths).toHaveBeenCalled()

    await act(async () => {
      openPathsHandler?.(['/ws/a.md', '/ws/sub/b.md', '/ws/skip.txt'])
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.readFile).toHaveBeenCalledWith('/ws/a.md')
    expect(api.readFile).toHaveBeenCalledWith('/ws/sub/b.md')
    expect(api.readFile).not.toHaveBeenCalledWith('/ws/skip.txt')
    expect(api.listDir).toHaveBeenCalledWith('/ws')
    expect(latestEditorProps?.content).toBe('# B\n')
    expect(container.querySelectorAll('.tab')).toHaveLength(2) // a + b (no default untitled)
  })

  it('menu open with empty workspace sets root to parentDir', async () => {
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/alone/note.md',
      content: '# N\n'
    })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'open' })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.openFile).toHaveBeenCalled()
    expect(api.listDir).toHaveBeenCalledWith('/alone')
    expect(api.syncMenuState).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceRoot: '/alone' })
    )
    expect(latestEditorProps?.content).toBe('# N\n')
  })

  it('menu open with existing workspace does not change root', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/other/x.md',
      content: '# X\n'
    })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.mocked(api.listDir).mockClear()

    await act(async () => {
      menuHandler?.({ action: 'open' })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.openFile).toHaveBeenCalled()
    expect(latestEditorProps?.content).toBe('# X\n')
    expect(api.listDir).not.toHaveBeenCalled()
    expect(api.syncMenuState).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceRoot: '/ws' })
    )
  })

  it('onOpenPaths with existing workspace opens tabs but does not change root', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    vi.mocked(api.readFile).mockImplementation(async (filePath: string) => {
      if (filePath === '/other/a.md') return { ok: true as const, content: '# A\n' }
      return { ok: false as const, error: 'missing' }
    })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.mocked(api.listDir).mockClear()

    await act(async () => {
      openPathsHandler?.(['/other/a.md'])
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.readFile).toHaveBeenCalledWith('/other/a.md')
    expect(latestEditorProps?.content).toBe('# A\n')
    expect(api.listDir).not.toHaveBeenCalled()
    expect(api.syncMenuState).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceRoot: '/ws' })
    )
  })

  it('alerts when onOpenPaths receives only non-markdown paths', async () => {
    await renderApp()

    await act(async () => {
      openPathsHandler?.(['/ws/a.txt', '/ws/b.doc'])
      await Promise.resolve()
    })

    expect(alertSpy).toHaveBeenCalledWith('仅支持 Markdown 文件')
    expect(api.readFile).not.toHaveBeenCalled()
  })

  it('drop on window opens markdown via getPathForFile', async () => {
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# Dropped\n' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    vi.mocked(api.getPathForFile!).mockReturnValue('/drop/note.md')

    await renderApp()
    const shell = container.querySelector('.app-shell') as HTMLElement
    expect(shell).toBeTruthy()

    const file = new File(['x'], 'note.md', { type: 'text/markdown' })

    await act(async () => {
      const dragOver = new Event('dragover', { bubbles: true, cancelable: true })
      shell.dispatchEvent(dragOver)
      expect(dragOver.defaultPrevented).toBe(true)

      const drop = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
      Object.defineProperty(drop, 'dataTransfer', {
        value: { files: [file] }
      })
      shell.dispatchEvent(drop)
      expect(drop.defaultPrevented).toBe(true)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.getPathForFile).toHaveBeenCalled()
    expect(api.readFile).toHaveBeenCalledWith('/drop/note.md')
    expect(api.listDir).toHaveBeenCalledWith('/drop')
    expect(latestEditorProps?.content).toBe('# Dropped\n')
  })

  it('syncs recents and workspace root to main', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/proj' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    await renderApp()
    expect(api.syncMenuState).toHaveBeenCalledWith({
      recents: [],
      workspaceRoot: null
    })
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })
    expect(api.syncMenuState).toHaveBeenCalledWith({
      recents: [{ path: '/proj', kind: 'directory' }],
      workspaceRoot: '/proj'
    })
  })

  it('opens a recent file with empty workspace and sets root to parentDir', async () => {
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# R\n' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify([{ path: '/alone/r.md', kind: 'file' }])
    )
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openRecent', path: '/alone/r.md', kind: 'file' })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(api.readFile).toHaveBeenCalledWith('/alone/r.md')
    expect(latestEditorProps?.content).toBe('# R\n')
    expect(api.listDir).toHaveBeenCalledWith('/alone')
    expect(api.syncMenuState).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceRoot: '/alone' })
    )
  })

  it('opens a recent file with existing workspace without changing root', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({ ok: true, entries: [] })
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# R\n' })
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify([{ path: '/alone/r.md', kind: 'file' }])
    )
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
      await Promise.resolve()
    })
    vi.mocked(api.listDir).mockClear()

    await act(async () => {
      menuHandler?.({ action: 'openRecent', path: '/alone/r.md', kind: 'file' })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.readFile).toHaveBeenCalledWith('/alone/r.md')
    expect(latestEditorProps?.content).toBe('# R\n')
    expect(api.listDir).not.toHaveBeenCalled()
    expect(api.syncMenuState).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceRoot: '/ws' })
    )
  })

  it('removes a missing recent file after failed open', async () => {
    vi.mocked(api.readFile).mockResolvedValue({ ok: false, error: '读取失败：ENOENT' })
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify([{ path: '/gone.md', kind: 'file' }])
    )
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openRecent', path: '/gone.md', kind: 'file' })
      await Promise.resolve()
    })
    expect(alertSpy).toHaveBeenCalled()
    expect(api.syncMenuState).toHaveBeenCalledWith(
      expect.objectContaining({ recents: [] })
    )
  })

  it('clears recents via menu', async () => {
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify([{ path: '/a.md', kind: 'file' }])
    )
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'clearRecents' })
      await Promise.resolve()
    })
    expect(api.syncMenuState).toHaveBeenCalledWith(
      expect.objectContaining({ recents: [] })
    )
  })

  it('routes format/paragraph menu actions to applyEditorMenuAction when editor exists', async () => {
    applyEditorMenuActionMock.mockClear()
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await act(async () => {
      menuHandler?.({ action: 'bold' })
      await Promise.resolve()
    })
    expect(applyEditorMenuActionMock).toHaveBeenCalled()
    expect(applyEditorMenuActionMock.mock.calls.at(-1)?.[1]).toBe('bold')
  })

  it('ignores editor menu actions when getEditor returns null', async () => {
    // Cover the editorRef/getEditor null guard (create a tab first under empty-launch).
    editorStubReturnsEditor = false
    applyEditorMenuActionMock.mockClear()
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    await act(async () => {
      menuHandler?.({ action: 'bold' })
      await Promise.resolve()
    })
    expect(applyEditorMenuActionMock).not.toHaveBeenCalled()
  })

  it('launches with empty main pane and no default untitled tab', async () => {
    await renderApp()
    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeNull()
    expect(container.querySelector('[data-testid="editor"]')).toBeNull()
    expect(latestEditorProps).toBeNull()
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '新建文件'
    )
    const openBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '打开文件'
    )
    expect(newBtn).toBeTruthy()
    expect(openBtn).toBeTruthy()
  })

  it('empty-state 新建文件 creates an untitled tab via handleNew', async () => {
    await renderApp()
    const newBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '新建文件'
    ) as HTMLButtonElement
    expect(newBtn).toBeTruthy()

    await act(async () => {
      newBtn.click()
      await Promise.resolve()
    })

    // INITIAL_MARKDOWN is '' on master (4aae2ae)
    expect(latestEditorProps?.content).toBe('')
    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeTruthy()
    expect(
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '新建文件')
    ).toBeUndefined()
  })

  it('empty-state 打开文件 calls openFile', async () => {
    vi.mocked(api.openFile).mockResolvedValue({
      ok: true,
      path: '/tmp/from-empty.md',
      content: '# From empty\n'
    })
    await renderApp()
    const openBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '打开文件'
    ) as HTMLButtonElement
    expect(openBtn).toBeTruthy()

    await act(async () => {
      openBtn.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.openFile).toHaveBeenCalled()
    expect(latestEditorProps?.content).toBe('# From empty\n')
  })



  it('closing the last tab shows empty state without auto untitled', async () => {
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeTruthy()

    const closeBtn = container.querySelector(
      'button[aria-label="关闭 未命名"]'
    ) as HTMLButtonElement
    await act(async () => {
      closeBtn.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeNull()
    expect(container.querySelector('[data-testid="editor"]')).toBeNull()
    expect(
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '新建文件')
    ).toBeTruthy()
    expect(
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '打开文件')
    ).toBeTruthy()
  })

  it('deleting the last open file tab shows empty state without auto untitled', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'only.md', path: '/ws/only.md', kind: 'file' }]
    })
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# Only\n' })
    vi.mocked(api.deleteEntry).mockResolvedValue({ ok: true })
    confirmSpy.mockReturnValue(true)

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
      await Promise.resolve()
    })
    const fileBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('only.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    expect(fileBtn).toBeTruthy()
    await act(async () => {
      fileBtn.click()
      await Promise.resolve()
    })
    expect(latestEditorProps?.content).toBe('# Only\n')

    const fileRow = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('only.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    await act(async () => {
      fireEvent.contextMenu(fileRow)
      await Promise.resolve()
    })
    const delItem = Array.from(container.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent === '删除'
    ) as HTMLElement
    expect(delItem).toBeTruthy()
    await act(async () => {
      fireEvent.click(delItem)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.deleteEntry).toHaveBeenCalledWith('/ws/only.md')
    expect(container.querySelector('[data-testid="editor"]')).toBeNull()
    expect(container.querySelector('.tab')).toBeNull()
    expect(
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '新建文件')
    ).toBeTruthy()
  })

  it('File menu new still creates untitled after empty launch', async () => {
    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'new' })
      await Promise.resolve()
    })
    expect(latestEditorProps?.content).toBe('')
    expect(container.querySelector('[aria-label="关闭 未命名"]')).toBeTruthy()
  })

  it('reloadWorkspace re-lists workspace root without changing editor content', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' }]
    })
    vi.mocked(api.readFile).mockResolvedValue({ ok: true, content: '# On disk\n' })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    const fileBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').includes('a.md') && b.classList.contains('file-tree-item')
    ) as HTMLButtonElement
    await act(async () => {
      fileBtn.click()
      await Promise.resolve()
    })
    await simulateEdit('# Edited in tab\n')
    const contentBefore = latestEditorProps?.content
    expect(contentBefore).toBe('# Edited in tab\n')

    vi.mocked(api.listDir).mockClear()
    vi.mocked(api.listDir).mockResolvedValue({
      ok: true,
      entries: [
        { name: 'a.md', path: '/ws/a.md', kind: 'file' },
        { name: 'new.md', path: '/ws/new.md', kind: 'file' }
      ]
    })

    await act(async () => {
      menuHandler?.({ action: 'reloadWorkspace' })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.listDir).toHaveBeenCalledWith('/ws')
    expect(latestEditorProps?.content).toBe(contentBefore)
    expect(container.textContent).toContain('new.md')
  })

  it('reloadWorkspace keeps expanded folders open and re-fetches children', async () => {
    vi.mocked(api.openFolder).mockResolvedValue({ ok: true, path: '/ws' })
    vi.mocked(api.listDir).mockImplementation(async (dirPath: string) => {
      if (dirPath === '/ws') {
        return {
          ok: true as const,
          entries: [{ name: 'sub', path: '/ws/sub', kind: 'directory' as const }]
        }
      }
      if (dirPath === '/ws/sub') {
        return {
          ok: true as const,
          entries: [{ name: 'inner.md', path: '/ws/sub/inner.md', kind: 'file' as const }]
        }
      }
      return { ok: false as const, error: 'unexpected' }
    })

    await renderApp()
    await act(async () => {
      menuHandler?.({ action: 'openFolder' })
      await Promise.resolve()
    })

    const expandSub = screen.getByRole('button', { name: '展开 sub' })
    await act(async () => {
      expandSub.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByText('inner.md')).toBeTruthy()

    vi.mocked(api.listDir).mockImplementation(async (dirPath: string) => {
      if (dirPath === '/ws') {
        return {
          ok: true as const,
          entries: [{ name: 'sub', path: '/ws/sub', kind: 'directory' as const }]
        }
      }
      if (dirPath === '/ws/sub') {
        return {
          ok: true as const,
          entries: [
            { name: 'inner.md', path: '/ws/sub/inner.md', kind: 'file' as const },
            { name: 'added.md', path: '/ws/sub/added.md', kind: 'file' as const }
          ]
        }
      }
      return { ok: false as const, error: 'unexpected' }
    })

    await act(async () => {
      menuHandler?.({ action: 'reloadWorkspace' })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: '折叠 sub' })).toBeTruthy()
    expect(screen.getByText('added.md')).toBeTruthy()
    expect(vi.mocked(api.listDir).mock.calls.filter((c) => c[0] === '/ws/sub').length).toBeGreaterThan(
      1
    )
  })

  it('renders a sidebar splitter with col-resize cursor', async () => {
    await renderApp()
    const splitter = container.querySelector('.sidebar-splitter') as HTMLElement
    expect(splitter).toBeTruthy()
    expect(splitter.style.cursor).toBe('col-resize')
  })

  it('applies restored sidebar width from getSidebarWidth on mount', async () => {
    vi.mocked(api.getSidebarWidth).mockResolvedValue(300)
    await renderApp()
    await act(async () => {
      await Promise.resolve()
    })
    const sidebar = container.querySelector('.file-tree-sidebar') as HTMLElement
    expect(api.getSidebarWidth).toHaveBeenCalled()
    expect(sidebar.style.width).toBe('300px')
  })

  it('clamps live drag width and persists on pointerup', async () => {
    vi.mocked(api.getSidebarWidth).mockResolvedValue(220)
    await renderApp()
    await act(async () => {
      await Promise.resolve()
    })

    const splitter = container.querySelector('.sidebar-splitter') as HTMLElement
    const sidebar = container.querySelector('.file-tree-sidebar') as HTMLElement
    expect(splitter).toBeTruthy()

    await act(async () => {
      splitter.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 220,
          pointerId: 1,
          pointerType: 'mouse'
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 100,
          pointerId: 1,
          pointerType: 'mouse'
        })
      )
    })
    // 220 + (100 - 220) = 100 → clamp to 160
    expect(sidebar.style.width).toBe('160px')
    expect(api.setSidebarWidth).not.toHaveBeenCalled()

    await act(async () => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: 100,
          pointerId: 1,
          pointerType: 'mouse'
        })
      )
      await Promise.resolve()
    })
    expect(api.setSidebarWidth).toHaveBeenCalledWith(160)
  })

})
