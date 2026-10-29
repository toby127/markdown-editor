/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { DirEntry } from '../shared/fs-types'
import FileTree from './FileTree'

afterEach(() => {
  cleanup()
})

const sampleEntries: DirEntry[] = [
  { name: 'docs', path: '/ws/docs', kind: 'directory' },
  { name: 'readme.md', path: '/ws/readme.md', kind: 'file' }
]

describe('FileTree', () => {
  it('shows empty state and emits openFolder', () => {
    const onOpenFolder = vi.fn()
    render(
      <FileTree
        root={null}
        onOpenFolder={onOpenFolder}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={[]}
        loadChildren={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '打开文件夹' }))
    expect(onOpenFolder).toHaveBeenCalled()
  })

  it('renders root row, entries, and opens a file on click', () => {
    const onOpenFile = vi.fn()
    render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={onOpenFile}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={vi.fn()}
      />
    )
    expect(screen.getByText('ws')).toBeTruthy()
    expect(screen.getByText('docs')).toBeTruthy()
    expect(screen.getByText('readme.md')).toBeTruthy()
    fireEvent.click(screen.getByText('readme.md'))
    expect(onOpenFile).toHaveBeenCalledWith('/ws/readme.md')
  })

  it('marks the selected path row', () => {
    const { container } = render(
      <FileTree
        root="/ws"
        selectedPath="/ws/readme.md"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={vi.fn()}
      />
    )
    const selected = container.querySelector('.file-tree-row-selected')
    expect(selected).toBeTruthy()
    expect(selected?.textContent).toContain('readme.md')
  })

  it('expands a directory and loads children', async () => {
    const loadChildren = vi.fn(async () => [
      { name: 'nested.md', path: '/ws/docs/nested.md', kind: 'file' as const }
    ])
    render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(loadChildren).toHaveBeenCalledWith('/ws/docs')
      expect(screen.getByText('nested.md')).toBeTruthy()
    })
  })

  it('re-fetches children for expanded directories when refreshToken changes', async () => {
    const loadChildren = vi
      .fn()
      .mockResolvedValueOnce([
        { name: 'first.md', path: '/ws/docs/first.md', kind: 'file' as const }
      ])
      .mockResolvedValueOnce([
        { name: 'first.md', path: '/ws/docs/first.md', kind: 'file' as const },
        { name: 'second.md', path: '/ws/docs/second.md', kind: 'file' as const }
      ])
    const { rerender } = render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={0}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(screen.getByText('first.md')).toBeTruthy()
    })
    expect(loadChildren).toHaveBeenCalledTimes(1)

    rerender(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={1}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('second.md')).toBeTruthy()
    })
    expect(loadChildren).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: '折叠 docs' })).toBeTruthy()
  })

  it('keeps prior children when refresh loadChildren fails', async () => {
    const loadChildren = vi
      .fn()
      .mockResolvedValueOnce([
        { name: 'kept.md', path: '/ws/docs/kept.md', kind: 'file' as const }
      ])
      .mockResolvedValueOnce(null)
    const { rerender } = render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={0}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(screen.getByText('kept.md')).toBeTruthy()
    })

    rerender(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={1}
      />
    )
    await waitFor(() => {
      expect(loadChildren).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByText('kept.md')).toBeTruthy()
    expect(screen.getByRole('button', { name: '折叠 docs' })).toBeTruthy()
  })

  it('does not loadChildren for expanded paths removed from entries on refresh', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const loadChildren = vi.fn(async () => [
      { name: 'nested.md', path: '/ws/docs/nested.md', kind: 'file' as const }
    ])
    const { rerender } = render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={0}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(loadChildren).toHaveBeenCalledWith('/ws/docs')
    })
    loadChildren.mockClear()

    rerender(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={[{ name: 'readme.md', path: '/ws/readme.md', kind: 'file' }]}
        loadChildren={loadChildren}
        refreshToken={1}
      />
    )
    await waitFor(() => {
      expect(loadChildren).not.toHaveBeenCalled()
    })
    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('re-fetches collapsed directories after refresh when re-expanded', async () => {
    const loadChildren = vi
      .fn()
      .mockResolvedValueOnce([
        { name: 'stale.md', path: '/ws/docs/stale.md', kind: 'file' as const }
      ])
      .mockResolvedValueOnce([
        { name: 'fresh.md', path: '/ws/docs/fresh.md', kind: 'file' as const }
      ])
    const { rerender } = render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={0}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(screen.getByText('stale.md')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '折叠 docs' }))
    expect(screen.queryByText('stale.md')).toBeNull()

    rerender(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={loadChildren}
        refreshToken={1}
      />
    )
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: '展开 docs' }))
    await waitFor(() => {
      expect(loadChildren).toHaveBeenCalledTimes(2)
      expect(screen.getByText('fresh.md')).toBeTruthy()
    })
    expect(screen.queryByText('stale.md')).toBeNull()
  })

  it('does not open a file on right-click', () => {
    const onOpenFile = vi.fn()
    render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={onOpenFile}
        onRefreshRequest={vi.fn()}
        entries={sampleEntries}
        loadChildren={vi.fn()}
      />
    )
    fireEvent.contextMenu(screen.getByText('readme.md'))
    expect(onOpenFile).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeTruthy()
  })
})

describe('FileTree CRUD', () => {
  let promptSpy: ReturnType<typeof vi.spyOn>
  let confirmSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    promptSpy?.mockRestore()
    confirmSpy?.mockRestore()
  })

  function renderTree(
    overrides: Partial<{
      onCreateEntry: ReturnType<typeof vi.fn>
      onRenameEntry: ReturnType<typeof vi.fn>
      onDeleteEntry: ReturnType<typeof vi.fn>
      onOpenFile: ReturnType<typeof vi.fn>
      onRefreshRequest: ReturnType<typeof vi.fn>
    }> = {}
  ) {
    const onCreateEntry = overrides.onCreateEntry ?? vi.fn()
    const onRenameEntry = overrides.onRenameEntry ?? vi.fn()
    const onDeleteEntry = overrides.onDeleteEntry ?? vi.fn()
    const onOpenFile = overrides.onOpenFile ?? vi.fn()
    const onRefreshRequest = overrides.onRefreshRequest ?? vi.fn()
    render(
      <FileTree
        root="/ws"
        onOpenFolder={vi.fn()}
        onOpenFile={onOpenFile}
        onRefreshRequest={onRefreshRequest}
        entries={sampleEntries}
        loadChildren={vi.fn()}
        onCreateEntry={onCreateEntry}
        onRenameEntry={onRenameEntry}
        onDeleteEntry={onDeleteEntry}
      />
    )
    return { onCreateEntry, onRenameEntry, onDeleteEntry, onOpenFile, onRefreshRequest }
  }



  it('shows blank/root menu items on root row context menu', () => {
    renderTree()
    fireEvent.contextMenu(screen.getByText('ws'))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: '新建文件' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '新建文件夹' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '从磁盘重新加载' })).toBeTruthy()
    expect(within(menu).queryByRole('menuitem', { name: '重命名' })).toBeNull()
    expect(within(menu).queryByRole('menuitem', { name: '删除' })).toBeNull()
  })

  it('shows directory menu items on folder context menu', () => {
    renderTree()
    fireEvent.contextMenu(screen.getByText('docs'))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: '新建文件' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '新建文件夹' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '从磁盘重新加载' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '重命名' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '删除' })).toBeTruthy()
  })

  it('shows file menu items on file context menu', () => {
    renderTree()
    fireEvent.contextMenu(screen.getByText('readme.md'))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: '重命名' })).toBeTruthy()
    expect(within(menu).getByRole('menuitem', { name: '删除' })).toBeTruthy()
    expect(within(menu).queryByRole('menuitem', { name: '新建文件' })).toBeNull()
    expect(within(menu).queryByRole('menuitem', { name: '从磁盘重新加载' })).toBeNull()
  })

  it('shows reload on blank area context menu', () => {
    renderTree()
    fireEvent.contextMenu(screen.getByRole('tree'))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: '从磁盘重新加载' })).toBeTruthy()
  })

  it('calls onRefreshRequest when reload is selected from context menu', () => {
    const { onRefreshRequest } = renderTree()
    fireEvent.contextMenu(screen.getByText('ws'))
    fireEvent.click(screen.getByRole('menuitem', { name: '从磁盘重新加载' }))
    expect(onRefreshRequest).toHaveBeenCalledTimes(1)
  })

  it('renames an entry via context menu prompt', () => {
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('guide.md')
    const { onRenameEntry } = renderTree()
    fireEvent.contextMenu(screen.getByText('readme.md'))
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    expect(promptSpy).toHaveBeenCalled()
    expect(onRenameEntry).toHaveBeenCalledWith('/ws/readme.md', 'guide.md')
  })

  it('deletes an entry after confirm via context menu', () => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onDeleteEntry } = renderTree()
    fireEvent.contextMenu(screen.getByText('readme.md'))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除' }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(onDeleteEntry).toHaveBeenCalledWith('/ws/readme.md')
  })

  it('does not delete when confirm is canceled', () => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onDeleteEntry } = renderTree()
    fireEvent.contextMenu(screen.getByText('readme.md'))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除' }))
    expect(onDeleteEntry).not.toHaveBeenCalled()
  })

  it('creates a file in a directory via context menu', () => {
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('nested.md')
    const { onCreateEntry } = renderTree()
    fireEvent.contextMenu(screen.getByText('docs'))
    fireEvent.click(screen.getByRole('menuitem', { name: '新建文件' }))
    expect(onCreateEntry).toHaveBeenCalledWith('/ws/docs', 'nested.md', 'file')
  })

  it('creates at root via blank area context menu', () => {
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('blank.md')
    const { onCreateEntry } = renderTree()
    fireEvent.contextMenu(screen.getByRole('tree'))
    const menu = screen.getByRole('menu')
    fireEvent.click(within(menu).getByRole('menuitem', { name: '新建文件' }))
    expect(onCreateEntry).toHaveBeenCalledWith('/ws', 'blank.md', 'file')
  })

})
