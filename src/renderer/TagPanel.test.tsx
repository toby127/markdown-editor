/** @vitest-environment happy-dom */
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => cleanup())
import TagPanel from './TagPanel'
import type { TagFile } from '../shared/ipc'

const FILES: TagFile[] = [
  { path: '/ws/a.md', name: 'a.md', title: 'Go 笔记', tags: ['go', 'backend'] },
  { path: '/ws/b.md', name: 'b.md', title: null, tags: ['go'] },
  { path: '/ws/c.md', name: 'c.md', title: 'React', tags: ['frontend'] }
]

describe('TagPanel', () => {
  it('lists tags with counts and filters by tag', () => {
    render(
      <TagPanel
        files={FILES}
        error={null}
        scanning={false}
        root="/ws"
        onOpenFile={() => {}}
        onRefresh={() => {}}
      />
    )
    expect(screen.getByText('3 个标签 · 3 个文件')).toBeTruthy()
    expect(screen.getByTitle('2 个文件').textContent).toContain('go')

    fireEvent.click(screen.getByRole('button', { name: /go 2/ }))
    expect(screen.queryByText('React')).toBeNull()
    expect(screen.getByText('Go 笔记')).toBeTruthy()
    expect(screen.getByText('b.md')).toBeTruthy()
  })

  it('opens a file when its title is clicked', () => {
    const onOpenFile = vi.fn()
    render(
      <TagPanel
        files={FILES}
        error={null}
        scanning={false}
        root="/ws"
        onOpenFile={onOpenFile}
        onRefresh={() => {}}
      />
    )
    fireEvent.click(screen.getByText('Go 笔记'))
    expect(onOpenFile).toHaveBeenCalledWith('/ws/a.md')
  })

  it('shows an empty state without a workspace', () => {
    render(
      <TagPanel
        files={[]}
        error={null}
        scanning={false}
        root={null}
        onOpenFile={() => {}}
        onRefresh={() => {}}
      />
    )
    expect(screen.getByText('打开文件夹后可查看标签索引')).toBeTruthy()
  })
})
