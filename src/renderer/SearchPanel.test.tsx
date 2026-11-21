/** @vitest-environment happy-dom */
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchPanel from './SearchPanel'
import type { IndexedFile } from '../shared/ipc'

afterEach(() => cleanup())

const FILES: IndexedFile[] = [
  {
    path: '/ws/a.md',
    name: 'a.md',
    title: 'Alpha Guide',
    tags: [],
    headings: [],
    links: [],
    content: '# Alpha Guide\n\nGolang backend\n'
  },
  {
    path: '/ws/b.md',
    name: 'b.md',
    title: null,
    tags: [],
    headings: [],
    links: [],
    content: 'unrelated\n'
  }
]

function renderPanel(onOpenFile = vi.fn(), onClose = vi.fn()): {
  onOpenFile: ReturnType<typeof vi.fn>
  onClose: ReturnType<typeof vi.fn>
} {
  render(
    <SearchPanel
      files={FILES}
      error={null}
      scanning={false}
      root="/ws"
      onOpenFile={onOpenFile}
      onRefresh={() => {}}
      onClose={onClose}
    />
  )
  return { onOpenFile, onClose }
}

describe('SearchPanel', () => {
  it('searches as the user types and shows highlighted snippets with line numbers', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('搜索工作区'), { target: { value: 'golang' } })
    expect(screen.getByText('1 个文件匹配')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Golang').tagName).toBe('MARK')
  })

  it('opens the matching file', () => {
    const { onOpenFile } = renderPanel()
    fireEvent.change(screen.getByLabelText('搜索工作区'), { target: { value: 'alpha' } })
    fireEvent.click(screen.getByTitle('/ws/a.md'))
    expect(onOpenFile).toHaveBeenCalledWith('/ws/a.md')
  })

  it('shows a no-match state', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('搜索工作区'), { target: { value: 'zzzz' } })
    expect(screen.getByText('没有找到「zzzz」')).toBeTruthy()
  })

  it('shows a workspace hint before searching', () => {
    render(
      <SearchPanel
        files={[]}
        error={null}
        scanning={false}
        root={null}
        onOpenFile={() => {}}
        onRefresh={() => {}}
      />
    )
    expect(screen.getByText('打开文件夹后可搜索工作区')).toBeTruthy()
  })

  it('closes on Esc from the input', () => {
    const { onClose } = renderPanel()
    fireEvent.keyDown(screen.getByLabelText('搜索工作区'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Esc from anywhere in the document', () => {
    const { onClose } = renderPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on a non-Esc key', () => {
    const { onClose } = renderPanel()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lets another handler consume Esc first (FindBar coexistence)', () => {
    const { onClose } = renderPanel()
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(onClose).not.toHaveBeenCalled()
  })
})
