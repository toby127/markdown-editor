/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import Sidebar from './Sidebar'

afterEach(() => cleanup())

const baseProps = {
  root: '/ws',
  entries: [{ name: 'a.md', path: '/ws/a.md', kind: 'file' as const }],
  selectedPath: '/ws/a.md',
  onOpenFolder: vi.fn(),
  onOpenFile: vi.fn(),
  onRefreshRequest: vi.fn(),
  loadChildren: vi.fn(),
  onCreateEntry: vi.fn(),
  outlineMarkdown: '# Hello',
  onOutlineJump: vi.fn(),
  visiblePanels: ['files', 'outline'] as ('files' | 'outline')[],
  panel: 'files' as const,
  onPanelChange: vi.fn(),
  onPanelHide: vi.fn(),
  onPanelShow: vi.fn()
}

describe('Sidebar', () => {
  it('renders one tab per visible panel, in canonical order', () => {
    render(<Sidebar {...baseProps} visiblePanels={['files', 'outline', 'links', 'tags']} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['文件', '大纲', '标签', '反链'])
    expect(screen.queryByRole('tab', { name: '搜索' })).toBeNull()
  })

  it('uses the controlled panel prop to decide which panel renders', () => {
    const { rerender } = render(
      <Sidebar {...baseProps} visiblePanels={['files', 'outline', 'tags', 'search', 'links']} />
    )
    expect(screen.getByText('a.md')).toBeTruthy()

    rerender(
      <Sidebar
        {...baseProps}
        visiblePanels={['files', 'outline', 'tags', 'search', 'links']}
        panel="outline"
      />
    )
    expect(screen.getByRole('button', { name: 'Hello' })).toBeTruthy()
    expect(screen.queryByText('a.md')).toBeNull()

    rerender(
      <Sidebar
        {...baseProps}
        visiblePanels={['files', 'outline', 'tags', 'search', 'links']}
        panel="tags"
      />
    )
    expect(screen.getByText('没有找到带 tags 的 Markdown 文件')).toBeTruthy()

    rerender(
      <Sidebar
        {...baseProps}
        visiblePanels={['files', 'outline', 'tags', 'search', 'links']}
        panel="search"
      />
    )
    expect(screen.getByLabelText('搜索工作区')).toBeTruthy()

    rerender(
      <Sidebar
        {...baseProps}
        visiblePanels={['files', 'outline', 'tags', 'search', 'links']}
        panel="links"
      />
    )
    expect(screen.getByText('出链')).toBeTruthy()
    expect(screen.getByText('反向链接')).toBeTruthy()
  })

  it('falls back to the first visible tab when the active panel was hidden', () => {
    render(<Sidebar {...baseProps} visiblePanels={['outline', 'tags']} panel="files" />)
    // 'files' is hidden, so outline (first visible) renders instead of an empty body.
    expect(screen.getByRole('button', { name: 'Hello' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('aria-selected'))).toEqual([
      'true',
      'false'
    ])
  })

  it('reports tab clicks through onPanelChange', () => {
    const onPanelChange = vi.fn()
    render(<Sidebar {...baseProps} panel="files" onPanelChange={onPanelChange} />)
    fireEvent.click(screen.getByRole('tab', { name: '大纲' }))
    expect(onPanelChange).toHaveBeenCalledWith('outline')
  })

  it('asks App to show the search panel from the file-tree context menu', () => {
    const onPanelShow = vi.fn()
    render(<Sidebar {...baseProps} panel="files" onPanelShow={onPanelShow} />)
    fireEvent.contextMenu(screen.getByText('a.md'))
    fireEvent.click(screen.getByRole('menuitem', { name: '搜索文件' }))
    expect(onPanelShow).toHaveBeenCalledWith('search')
  })

  it('asks App to hide the search panel on Esc', () => {
    const onPanelHide = vi.fn()
    render(
      <Sidebar
        {...baseProps}
        visiblePanels={['files', 'search']}
        panel="search"
        onPanelHide={onPanelHide}
      />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onPanelHide).toHaveBeenCalledWith('search')
  })

  it('files panel is FileTree only — no toolbar or recent list', () => {
    const { container } = render(<Sidebar {...baseProps} />)
    const panel = container.querySelector('.sidebar-panel-files') as HTMLElement
    expect(panel).toBeTruthy()
    expect(panel.querySelector('.file-tree-toolbar')).toBeNull()
    expect(panel.querySelector('.recent-list')).toBeNull()
    expect(panel.querySelector('.file-tree')).toBeTruthy()
    expect(screen.queryByText('最近打开')).toBeNull()
    expect(screen.queryByRole('button', { name: '新建文件' })).toBeNull()
    expect(screen.queryByRole('button', { name: '新建文件夹' })).toBeNull()
  })

  it('shows empty workspace state without create toolbar', () => {
    render(<Sidebar {...baseProps} root={null} entries={[]} />)
    expect(screen.getByText('未打开工作区')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '新建文件' })).toBeNull()
  })
})
