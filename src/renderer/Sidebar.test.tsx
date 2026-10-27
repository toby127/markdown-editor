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
  onOutlineJump: vi.fn()
}

describe('Sidebar', () => {
  it('switches between files and outline panels', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByText('a.md')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '大纲' }))
    expect(screen.getByRole('button', { name: 'Hello' })).toBeTruthy()
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
