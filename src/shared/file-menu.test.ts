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
      'reloadWorkspace',
      'save',
      'saveAs'
    ])
    expect(cmds.find((c) => c.action === 'newFile')?.enabled).toBe(false)
    expect(cmds.find((c) => c.action === 'newFolder')?.enabled).toBe(false)
    expect(cmds.find((c) => c.action === 'new')?.label).toBe('新建')
    expect(cmds.find((c) => c.action === 'newFile')?.label).toBe('新建文件')
    expect(cmds.find((c) => c.action === 'newFolder')?.label).toBe('新建文件夹')
  })

  it('places reloadWorkspace after openFolder with label 从磁盘重新加载', () => {
    const items = buildFileMenuSpecs({ workspaceRoot: '/ws', recents: [] })
    const openFolderIdx = items.findIndex(
      (i) => i.type === 'command' && i.action === 'openFolder'
    )
    const reloadIdx = items.findIndex(
      (i) => i.type === 'command' && i.action === 'reloadWorkspace'
    )
    const recentsIdx = items.findIndex((i) => i.type === 'submenu')
    expect(openFolderIdx).toBeGreaterThanOrEqual(0)
    expect(reloadIdx).toBe(openFolderIdx + 1)
    expect(recentsIdx).toBe(reloadIdx + 1)
    const reload = items[reloadIdx] as FileMenuCommandSpec
    expect(reload.label).toBe('从磁盘重新加载')
  })

  it('disables reloadWorkspace when workspace root is null or empty', () => {
    for (const workspaceRoot of [null, ''] as const) {
      const cmds = commands(buildFileMenuSpecs({ workspaceRoot, recents: [] }))
      expect(cmds.find((c) => c.action === 'reloadWorkspace')?.enabled).toBe(
        false
      )
    }
  })

  it('enables reloadWorkspace when workspace root is set', () => {
    const cmds = commands(
      buildFileMenuSpecs({ workspaceRoot: '/ws', recents: [] })
    )
    expect(cmds.find((c) => c.action === 'reloadWorkspace')?.enabled).toBe(true)
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
