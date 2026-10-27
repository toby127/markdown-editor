import { describe, expect, it } from 'vitest'
import { filterDirEntries, openOrActivateTab, removeTabsUnderPath, updateTabPath, anyDirty } from './tabs'
import type { TabModel } from './fs-types'

describe('filterDirEntries', () => {
  it('keeps directories and markdown only', () => {
    const out = filterDirEntries([
      { name: 'docs', path: '/w/docs', isDirectory: true },
      { name: 'a.md', path: '/w/a.md', isDirectory: false },
      { name: 'b.txt', path: '/w/b.txt', isDirectory: false }
    ])
    expect(out.map((e) => e.name)).toEqual(['docs', 'a.md'])
  })
})

describe('openOrActivateTab', () => {
  it('activates existing path instead of duplicating', () => {
    const tabs: TabModel[] = [
      { id: '1', path: '/w/a.md', title: 'a.md', content: 'x', dirty: false }
    ]
    const r = openOrActivateTab(tabs, '/w/a.md', 'ignored', () => '2')
    expect(r.tabs).toHaveLength(1)
    expect(r.activeTabId).toBe('1')
  })
  it('opens new tab when missing', () => {
    const r = openOrActivateTab([], '/w/b.md', 'hi', () => 'n1')
    expect(r.tabs[0]).toMatchObject({ id: 'n1', path: '/w/b.md', content: 'hi', dirty: false })
    expect(r.activeTabId).toBe('n1')
  })
})

describe('path sync helpers', () => {
  it('updates path and title on rename', () => {
    const tabs: TabModel[] = [
      { id: '1', path: '/w/a.md', title: 'a.md', content: '', dirty: false }
    ]
    expect(updateTabPath(tabs, '/w/a.md', '/w/b.md')[0]).toMatchObject({
      path: '/w/b.md',
      title: 'b.md'
    })
  })
  it('removes tabs under deleted folder', () => {
    const tabs: TabModel[] = [
      { id: '1', path: '/w/d/a.md', title: 'a.md', content: '', dirty: false },
      { id: '2', path: '/w/other.md', title: 'other.md', content: '', dirty: true }
    ]
    const next = removeTabsUnderPath(tabs, '/w/d')
    expect(next.map((t) => t.id)).toEqual(['2'])
    expect(anyDirty(next)).toBe(true)
  })
})

describe('path identity across separators', () => {
  it('activates existing tab when path separators differ', () => {
    const tabs: TabModel[] = [
      { id: '1', path: 'C:\\ws\\a.md', title: 'a.md', content: 'x', dirty: false }
    ]
    const r = openOrActivateTab(tabs, 'C:/ws/a.md', 'ignored', () => '2')
    expect(r.tabs).toHaveLength(1)
    expect(r.activeTabId).toBe('1')
  })

  it('updates tab path when fromPath separators differ', () => {
    const tabs: TabModel[] = [
      { id: '1', path: 'C:\\ws\\a.md', title: 'a.md', content: '', dirty: false }
    ]
    expect(updateTabPath(tabs, 'C:/ws/a.md', 'C:/ws/b.md')[0]).toMatchObject({
      path: 'C:/ws/b.md',
      title: 'b.md'
    })
  })

  it('removes tabs under folder when separators differ', () => {
    const tabs: TabModel[] = [
      { id: '1', path: 'C:\\ws\\d\\a.md', title: 'a.md', content: '', dirty: false },
      { id: '2', path: 'C:\\ws\\other.md', title: 'other.md', content: '', dirty: true }
    ]
    const next = removeTabsUnderPath(tabs, 'C:/ws/d')
    expect(next.map((t) => t.id)).toEqual(['2'])
  })
})
