import { describe, expect, it } from 'vitest'
import type { IndexedFile } from './ipc'
import { searchWorkspace } from './workspace-search'

const files: IndexedFile[] = [
  {
    path: '/ws/alpha.md',
    name: 'alpha.md',
    title: 'Alpha Guide',
    tags: [],
    headings: [],
    links: [],
    content: '# Alpha Guide\n\nGolang backend notes\nsecond golang line\n'
  },
  {
    path: '/ws/beta.md',
    name: 'beta.md',
    title: null,
    tags: [],
    headings: [],
    links: [],
    content: 'unrelated\nGOLANG in caps\n'
  },
  {
    path: '/ws/gamma.md',
    name: 'gamma.md',
    title: 'Something else',
    tags: [],
    headings: [],
    links: [],
    content: 'nothing relevant here\n'
  }
]

describe('searchWorkspace', () => {
  it('returns nothing for an empty query', () => {
    expect(searchWorkspace(files, '   ')).toEqual([])
  })

  it('prefers title matches over body matches', () => {
    const results = searchWorkspace(files, 'alpha')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('/ws/alpha.md')
    expect(results[0].titleMatch).toBe(true)
  })

  it('matches case-insensitively and reports line numbers', () => {
    const results = searchWorkspace(files, 'golang')
    const beta = results.find((r) => r.path === '/ws/beta.md')
    expect(beta).toBeTruthy()
    expect(beta?.hits[0].line).toBe(2)
    expect(beta?.hits[0].snippet).toContain('GOLANG')
  })

  it('caps hits per file', () => {
    const file: IndexedFile = {
      path: '/ws/many.md',
      name: 'many.md',
      title: null,
      tags: [],
      headings: [],
      links: [],
      content: Array.from({ length: 10 }, (_, i) => `term line ${i}`).join('\n')
    }
    const [result] = searchWorkspace([file], 'term')
    expect(result.hits).toHaveLength(3)
    expect(result.hits[0].line).toBe(1)
    expect(result.hits[2].line).toBe(3)
  })
})
