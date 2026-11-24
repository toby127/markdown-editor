import { t, type ResolvedLanguage } from './i18n'
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

export function buildFileMenuSpecs(
  state: {
    workspaceRoot: string | null
    recents: RecentEntry[]
  },
  lang: ResolvedLanguage = 'zh'
): FileMenuItemSpec[] {
  const hasRoot = state.workspaceRoot != null && state.workspaceRoot !== ''
  const recentItems: Array<FileMenuCommandSpec | FileMenuSeparatorSpec> =
    state.recents.length === 0
      ? [
          {
            type: 'command',
            action: 'openRecent',
            label: t('fileNoRecents', lang),
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
            label: t('fileClearRecents', lang),
            enabled: true
          }
        ]

  return [
    {
      type: 'command',
      action: 'new',
      label: t('fileNew', lang),
      enabled: true,
      accelerator: 'CmdOrCtrl+N'
    },
    {
      type: 'command',
      action: 'newFile',
      label: t('fileNewFile', lang),
      enabled: hasRoot
    },
    {
      type: 'command',
      action: 'newFolder',
      label: t('fileNewFolder', lang),
      enabled: hasRoot
    },
    { type: 'separator' },
    {
      type: 'command',
      action: 'open',
      label: t('fileOpen', lang),
      enabled: true,
      accelerator: 'CmdOrCtrl+O'
    },
    {
      type: 'command',
      action: 'openFolder',
      label: t('fileOpenFolder', lang),
      enabled: true,
      accelerator: 'CmdOrCtrl+Shift+O'
    },
    {
      type: 'command',
      action: 'reloadWorkspace',
      label: t('fileReload', lang),
      enabled: hasRoot
    },
    {
      type: 'submenu',
      id: 'recents',
      label: t('fileRecents', lang),
      items: recentItems
    },
    { type: 'separator' },
    {
      type: 'command',
      action: 'save',
      label: t('fileSave', lang),
      enabled: true,
      accelerator: 'CmdOrCtrl+S'
    },
    {
      type: 'command',
      action: 'saveAs',
      label: t('fileSaveAs', lang),
      enabled: true,
      accelerator: 'CmdOrCtrl+Shift+S'
    },
    { type: 'separator' },
    {
      type: 'command',
      action: 'exportHtml',
      label: t('fileExportHtml', lang),
      enabled: true
    },
    {
      type: 'command',
      action: 'exportPdf',
      label: t('fileExportPdf', lang),
      enabled: true
    }
  ]
}
