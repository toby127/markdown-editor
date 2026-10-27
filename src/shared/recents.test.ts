import { describe, expect, it } from 'vitest'
import {
  recordRecent,
  removeRecent,
  parseRecentsJson,
  serializeRecents,
  RECENTS_MAX
} from './recents'

describe('recordRecent', () => {
  it('prepends and dedupes by normalized path', () => {
    const a = recordRecent([], { path: 'C:\\ws\\a.md', kind: 'file' })
    const b = recordRecent(a, { path: 'C:/ws/b', kind: 'directory' })
    const c = recordRecent(b, { path: 'C:/ws/a.md', kind: 'file' })
    expect(c.map((e) => e.path)).toEqual(['C:/ws/a.md', 'C:/ws/b'])
    expect(c[0].kind).toBe('file')
  })

  it('caps at RECENTS_MAX', () => {
    let list: ReturnType<typeof recordRecent> = []
    for (let i = 0; i < RECENTS_MAX + 3; i++) {
      list = recordRecent(list, { path: `/f/${i}.md`, kind: 'file' })
    }
    expect(list).toHaveLength(RECENTS_MAX)
    expect(list[0].path).toBe(`/f/${RECENTS_MAX + 2}.md`)
  })
})

describe('removeRecent / json', () => {
  it('removes by path and round-trips json', () => {
    const list = [
      { path: '/a.md', kind: 'file' as const },
      { path: '/dir', kind: 'directory' as const }
    ]
    expect(removeRecent(list, '/a.md')).toEqual([{ path: '/dir', kind: 'directory' }])
    const raw = serializeRecents(list)
    expect(parseRecentsJson(raw)).toEqual(list)
    expect(parseRecentsJson('not-json')).toEqual([])
    expect(parseRecentsJson(null)).toEqual([])
  })
})
