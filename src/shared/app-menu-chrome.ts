import { t, type ResolvedLanguage, type TranslationKey } from './i18n'
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

/** Default zh keeps existing callers (and tests) unchanged; pass a language to localize. */
export const appMenuLabel = (key: TranslationKey, lang: ResolvedLanguage = 'zh'): string => t(key, lang)

export const APP_MENU_FILE_LABEL = '文件'
export const APP_MENU_EDIT_LABEL = '编辑'
export const APP_MENU_VIEW_LABEL = '视图'
export const APP_MENU_APPEARANCE_LABEL = '外观'
export const APP_MENU_PARAGRAPH_LABEL = '段落'
export const APP_MENU_FORMAT_LABEL = '格式'

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
export function buildViewMenuSubmenuItems(lang: ResolvedLanguage = 'zh'): ViewMenuActionItem[] {
  return [
    { action: 'viewFiles', label: t('viewFiles', lang), panel: 'files' },
    { action: 'viewOutline', label: t('viewOutline', lang), panel: 'outline' },
    { action: 'viewTags', label: t('viewTags', lang), panel: 'tags' },
    { action: 'viewBacklinks', label: t('viewBacklinks', lang), panel: 'links' }
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

export const buildAppearanceMenuSubmenuItems = (
  lang: ResolvedLanguage = 'zh'
): AppearanceMenuActionItem[] => [
  {
    action: 'toggleFocusMode',
    label: t('appearanceFocus', lang),
    prefsKey: 'focusMode',
    checkedWhen: true
  },
  {
    action: 'toggleTypewriterMode',
    label: t('appearanceTypewriter', lang),
    prefsKey: 'typewriterMode',
    checkedWhen: true
  },
  {
    action: 'toggleTheme',
    label: t('appearanceDarkTheme', lang),
    prefsKey: 'theme',
    checkedWhen: 'dark'
  },
  {
    action: 'toggleSpellcheck',
    label: t('appearanceSpellcheck', lang),
    prefsKey: 'spellcheck',
    checkedWhen: true
  }
]

export type LanguageMenuActionName = Extract<
  MenuActionName,
  'setLanguageSystem' | 'setLanguageZh' | 'setLanguageEn'
>
export type LanguageMenuActionItem = {
  action: LanguageMenuActionName
  label: string
  value: 'system' | 'zh' | 'en'
}

/** Language submenu shown inside 外观 / Appearance. */
export function buildLanguageMenuSubmenuItems(
  lang: ResolvedLanguage = 'zh'
): LanguageMenuActionItem[] {
  return [
    { action: 'setLanguageSystem', label: t('languageSystem', lang), value: 'system' },
    { action: 'setLanguageZh', label: t('languageZh', lang), value: 'zh' },
    { action: 'setLanguageEn', label: t('languageEn', lang), value: 'en' }
  ]
}

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

const editRoleKeys: Record<EditMenuRole, TranslationKey> = {
  undo: 'editUndo',
  redo: 'editRedo',
  cut: 'editCut',
  copy: 'editCopy',
  paste: 'editPaste',
  selectAll: 'editSelectAll'
}

export function buildEditMenuSubmenuItems(lang: ResolvedLanguage = 'zh'): EditMenuSubmenuItem[] {
  return [
    { role: 'undo', label: t('editUndo', lang) },
    { role: 'redo', label: t('editRedo', lang) },
    { type: 'separator' },
    { role: 'cut', label: t('editCut', lang) },
    { role: 'copy', label: t('editCopy', lang) },
    { role: 'paste', label: t('editPaste', lang) },
    { role: 'selectAll', label: t('editSelectAll', lang) },
    { type: 'separator' },
    { action: 'find', label: t('editFind', lang), accelerator: 'CmdOrCtrl+F' },
    { action: 'findReplace', label: t('editFindReplace', lang), accelerator: 'CmdOrCtrl+Shift+H' }
  ]
}
