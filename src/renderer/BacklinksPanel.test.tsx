/** @vitest-environment happy-dom */
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BacklinksPanel from './BacklinksPanel'
import type { IndexedFile } from '../shared/ipc'

afterEach(() => cleanup())

const FILES: IndexedFile[] = [
  {
    path: '/ws/current.md',
    name: 'current.md',
    title: null,
    tags: [],
    headings: [],
    links: ['target'],
    content: 'see [[target]]\n'
  },
  {
    path: '/ws/target.md',
    name: 'target.md',
    title: 'Target Note',
    tags: [],
    headings: [],
    links: [],
    content: 'destination\n'
  },
  {
    path: '/ws/other.md',
    name: 'other.md',
    title: 'Other',
    tags: [],
    headings: [],
    links: ['current'],
    content: 'see [[current]] here\n'
  }
]

describe('BacklinksPanel', () => {
  it('lists outgoing and incoming links with context', () => {
    render(
      <BacklinksPanel
        files={FILES}
        currentPath="/ws/current.md"
        root="/ws"
        onOpenFile={() => {}}
      />
    )
    expect(screen.getByText('出链')).toBeTruthy()
    expect(screen.getByText('反向链接')).toBeTruthy()
    expect(screen.getByText('Target Note')).toBeTruthy()
    expect(screen.getByText('Other')).toBeTruthy()
    expect(screen.getByText('see [[current]] here')).toBeTruthy()
  })

  it('opens a linked file', () => {
    const onOpenFile = vi.fn()
    render(
      <BacklinksPanel
        files={FILES}
        currentPath="/ws/current.md"
        root="/ws"
        onOpenFile={onOpenFile}
      />
    )
    fireEvent.click(screen.getByText('Other'))
    expect(onOpenFile).toHaveBeenCalledWith('/ws/other.md')
  })

  it('explains when no file is open', () => {
    render(
      <BacklinksPanel files={FILES} currentPath={null} root="/ws" onOpenFile={() => {}} />
    )
    expect(screen.getByText('打开一个文件后可查看双向链接')).toBeTruthy()
  })
})
