import { describe, expect, it } from 'vitest'
import { buildFileMenuSpecs } from './file-menu'
import type { FileMenuCommandSpec, FileMenuSubmenuSpec } from './file-menu'

function commands(items: ReturnType<typeof buildFileMenuSpecs>): FileMenuCommandSpec[] {
  return items.filter((i): i is FileMenuCommandSpec => i.type === 'command')
}

function recentsSub(items: ReturnType<typeof buildFileMenuSpecs>): FileMenuSubmenuSpec {
  const sub = items.find((i): i is FileMenuSubmenuSpec => i.type === 'submenu')
  if (!sub) throw new Error('missing recents submenu')
  return sub
}

describe('buildFileMenuSpecs', () => {
  it('orders File commands and disables create without root', () => {
    const items = buildFileMenuSpecs({ workspaceRoot: null, recents: [] })
    const cmds = commands(items)
    expect(cmds.map((c) => c.action)).toEqual([
      'new',
      'newFile',
      'newFolder',
      'open',
      'openFolder',
      'save',
      'saveAs'
    ])
    expect(cmds.find((c) => c.action === 'newFile')?.enabled).toBe(false)
    expect(cmds.find((c) => c.action === 'newFolder')?.enabled).toBe(false)
    expect(cmds.find((c) => c.action === 'new')?.label).toBe('新建')
    expect(cmds.find((c) => c.action === 'newFile')?.label).toBe('新建文件')
    expect(cmds.find((c) => c.action === 'newFolder')?.label).toBe('新建文件夹')
  })

  it('enables create when workspace root is set', () => {
    const cmds = commands(
      buildFileMenuSpecs({ workspaceRoot: '/ws', recents: [] })
    )
    expect(cmds.find((c) => c.action === 'newFile')?.enabled).toBe(true)
    expect(cmds.find((c) => c.action === 'newFolder')?.enabled).toBe(true)
  })

  it('shows disabled empty placeholder in recents submenu', () => {
    const sub = recentsSub(buildFileMenuSpecs({ workspaceRoot: null, recents: [] }))
    expect(sub.label).toBe('最近打开')
    expect(sub.items).toEqual([
      {
        type: 'command',
        action: 'openRecent',
        label: '无最近打开',
        enabled: false
      }
    ])
  })

  it('lists recent entries then clear action', () => {
    const sub = recentsSub(
      buildFileMenuSpecs({
        workspaceRoot: '/ws',
        recents: [
          { path: '/ws/a.md', kind: 'file' },
          { path: '/docs', kind: 'directory' }
        ]
      })
    )
    expect(sub.items[0]).toMatchObject({
      type: 'command',
      action: 'openRecent',
      label: 'a.md',
      path: '/ws/a.md',
      kind: 'file',
      enabled: true
    })
    expect(sub.items[1]).toMatchObject({
      type: 'command',
      action: 'openRecent',
      label: 'docs',
      path: '/docs',
      kind: 'directory',
      enabled: true
    })
    expect(sub.items[2]).toEqual({ type: 'separator' })
    expect(sub.items[3]).toMatchObject({
      type: 'command',
      action: 'clearRecents',
      label: '清除最近打开',
      enabled: true
    })
  })
})
