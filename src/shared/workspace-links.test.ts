import { describe, expect, it } from 'vitest'
import type { IndexedFile } from './ipc'
import { collectWorkspaceLinks } from './workspace-links'

const files: IndexedFile[] = [
  {
    path: '/ws/current.md',
    name: 'current.md',
    title: 'Current',
    tags: [],
    headings: [],
    links: ['target', 'target'],
    content: 'See [[target|Alias]] and [[target]]\n'
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
    title: null,
    tags: [],
    headings: [],
    links: ['current'],
    content: 'link to [[current]] here\n'
  }
]

describe('collectWorkspaceLinks', () => {
  it('returns empty lists without a current file', () => {
    expect(collectWorkspaceLinks(files, null)).toEqual({ outgoing: [], backlinks: [] })
    expect(collectWorkspaceLinks(files, '/ws/missing.md')).toEqual({
      outgoing: [],
      backlinks: []
    })
  })

  it('resolves outgoing links once, with source context', () => {
    const { outgoing } = collectWorkspaceLinks(files, '/ws/current.md')
    expect(outgoing).toHaveLength(1)
    expect(outgoing[0].path).toBe('/ws/target.md')
    expect(outgoing[0].title).toBe('Target Note')
    expect(outgoing[0].contexts).toContain('See [[target|Alias]] and [[target]]')
  })

  it('finds files linking to the current file', () => {
    const { backlinks } = collectWorkspaceLinks(files, '/ws/current.md')
    expect(backlinks).toHaveLength(1)
    expect(backlinks[0].path).toBe('/ws/other.md')
    expect(backlinks[0].contexts).toContain('link to [[current]] here')
  })

  it('does not list the current file as its own backlink', () => {
    const selfLinked: IndexedFile[] = [
      { ...files[0], links: ['current'], content: '[[current]]' }
    ]
    expect(collectWorkspaceLinks(selfLinked, '/ws/current.md').backlinks).toEqual([])
  })
})
