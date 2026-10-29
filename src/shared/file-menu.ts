import type { MenuActionName } from './ipc'
import { fileName } from './paths'
import { RECENTS_MAX, type RecentEntry } from './recents'

export type FileMenuCommandSpec = {
  type: 'command'
  action: MenuActionName
  label: string
  enabled: boolean
  accelerator?: string
  path?: string
  kind?: 'file' | 'directory'
}

export type FileMenuSeparatorSpec = { type: 'separator' }

export type FileMenuSubmenuSpec = {
  type: 'submenu'
  id: 'recents'
  label: string
  items: Array<FileMenuCommandSpec | FileMenuSeparatorSpec>
}

export type FileMenuItemSpec =
  | FileMenuCommandSpec
  | FileMenuSeparatorSpec
  | FileMenuSubmenuSpec

export function buildFileMenuSpecs(state: {
  workspaceRoot: string | null
  recents: RecentEntry[]
}): FileMenuItemSpec[] {
  const hasRoot = state.workspaceRoot != null && state.workspaceRoot !== ''
  const recentItems: Array<FileMenuCommandSpec | FileMenuSeparatorSpec> =
    state.recents.length === 0
      ? [
          {
            type: 'command',
            action: 'openRecent',
            label: '无最近打开',
            enabled: false
          }
        ]
      : [
          ...state.recents.slice(0, RECENTS_MAX).map(
            (entry): FileMenuCommandSpec => ({
              type: 'command',
              action: 'openRecent',
              label: fileName(entry.path),
              enabled: true,
              path: entry.path,
              kind: entry.kind
            })
          ),
          { type: 'separator' },
          {
            type: 'command',
            action: 'clearRecents',
            label: '清除最近打开',
            enabled: true
          }
        ]

  return [
    {
      type: 'command',
      action: 'new',
      label: '新建',
      enabled: true,
      accelerator: 'CmdOrCtrl+N'
    },
    {
      type: 'command',
      action: 'newFile',
      label: '新建文件',
      enabled: hasRoot
    },
    {
      type: 'command',
      action: 'newFolder',
      label: '新建文件夹',
      enabled: hasRoot
    },
    { type: 'separator' },
    {
      type: 'command',
      action: 'open',
      label: '打开…',
      enabled: true,
      accelerator: 'CmdOrCtrl+O'
    },
    {
      type: 'command',
      action: 'openFolder',
      label: '打开文件夹…',
      enabled: true,
      accelerator: 'CmdOrCtrl+Shift+O'
    },
    {
      type: 'command',
      action: 'reloadWorkspace',
      label: '从磁盘重新加载',
      enabled: hasRoot
    },
    {
      type: 'submenu',
      id: 'recents',
      label: '最近打开',
      items: recentItems
    },
    { type: 'separator' },
    {
      type: 'command',
      action: 'save',
      label: '保存',
      enabled: true,
      accelerator: 'CmdOrCtrl+S'
    },
    {
      type: 'command',
      action: 'saveAs',
      label: '另存为…',
      enabled: true,
      accelerator: 'CmdOrCtrl+Shift+S'
    }
  ]
}
