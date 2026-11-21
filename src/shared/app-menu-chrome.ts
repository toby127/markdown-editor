import type { MenuActionName } from './ipc'

export type EditMenuRole = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'

export type EditMenuRoleItem = { role: EditMenuRole; label: string }
export type EditMenuSeparator = { type: 'separator' }
/** Custom action routed through our IPC instead of an Electron role. */
export type EditMenuActionItem = {
  action: 'find' | 'findReplace'
  label: string
  accelerator: string
}
export type EditMenuSubmenuItem = EditMenuRoleItem | EditMenuSeparator | EditMenuActionItem

export const APP_MENU_FILE_LABEL = '文件'
export const APP_MENU_EDIT_LABEL = '编辑'
export const APP_MENU_VIEW_LABEL = '视图'
export const APP_MENU_APPEARANCE_LABEL = '外观'

export type ViewMenuActionName = Extract<
  MenuActionName,
  'viewFiles' | 'viewOutline' | 'viewTags' | 'viewBacklinks'
>
export type ViewMenuActionItem = {
  action: ViewMenuActionName
  label: string
  /** Sidebar panel id this action toggles — shared by main (checked state) and renderer. */
  panel: string
}

export const viewActionLabels = {
  viewFiles: '文件',
  viewOutline: '大纲',
  viewTags: '标签',
  viewBacklinks: '反链'
} as const

/** The View menu owns the sidebar panels that used to be permanent tabs.
 * Search is intentionally absent here — it lives in the file-tree context menu. */
export function buildViewMenuSubmenuItems(): ViewMenuActionItem[] {
  return [
    { action: 'viewFiles', label: viewActionLabels.viewFiles, panel: 'files' },
    { action: 'viewOutline', label: viewActionLabels.viewOutline, panel: 'outline' },
    { action: 'viewTags', label: viewActionLabels.viewTags, panel: 'tags' },
    { action: 'viewBacklinks', label: viewActionLabels.viewBacklinks, panel: 'links' }
  ]
}

/** Toggles exposed in the "外观" menu. Doubles as the state keys synced from the renderer. */
export type AppearancePrefsKey = 'focusMode' | 'typewriterMode' | 'theme' | 'spellcheck'
export type AppearanceMenuActionName = Extract<
  MenuActionName,
  'toggleFocusMode' | 'toggleTypewriterMode' | 'toggleTheme' | 'toggleSpellcheck'
>
export type AppearanceMenuActionItem = {
  action: AppearanceMenuActionName
  label: string
  prefsKey: AppearancePrefsKey
  /** Checkbox is checked when the pref equals `true`, or (for theme) equals 'dark'. */
  checkedWhen: true | 'dark'
}

export const buildAppearanceMenuSubmenuItems = (): AppearanceMenuActionItem[] => [
  {
    action: 'toggleFocusMode',
    label: '专注模式',
    prefsKey: 'focusMode',
    checkedWhen: true
  },
  {
    action: 'toggleTypewriterMode',
    label: '打字机模式',
    prefsKey: 'typewriterMode',
    checkedWhen: true
  },
  {
    action: 'toggleTheme',
    label: '深色主题',
    prefsKey: 'theme',
    checkedWhen: 'dark'
  },
  {
    action: 'toggleSpellcheck',
    label: '拼写检查',
    prefsKey: 'spellcheck',
    checkedWhen: true
  }
]

export const editRoleLabels: Record<EditMenuRole, string> = {
  undo: '撤销',
  redo: '重做',
  cut: '剪切',
  copy: '复制',
  paste: '粘贴',
  selectAll: '全选'
}

export const editActionLabels = {
  find: '查找',
  findReplace: '查找并替换'
} as const

export function buildEditMenuSubmenuItems(): EditMenuSubmenuItem[] {
  return [
    { role: 'undo', label: editRoleLabels.undo },
    { role: 'redo', label: editRoleLabels.redo },
    { type: 'separator' },
    { role: 'cut', label: editRoleLabels.cut },
    { role: 'copy', label: editRoleLabels.copy },
    { role: 'paste', label: editRoleLabels.paste },
    { role: 'selectAll', label: editRoleLabels.selectAll },
    { type: 'separator' },
    { action: 'find', label: editActionLabels.find, accelerator: 'CmdOrCtrl+F' },
    { action: 'findReplace', label: editActionLabels.findReplace, accelerator: 'CmdOrCtrl+Shift+H' }
  ]
}
