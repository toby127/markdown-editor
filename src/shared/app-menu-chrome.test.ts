import { describe, expect, it } from 'vitest'
import {
  APP_MENU_APPEARANCE_LABEL,
  APP_MENU_EDIT_LABEL,
  APP_MENU_FILE_LABEL,
  APP_MENU_VIEW_LABEL,
  buildAppearanceMenuSubmenuItems,
  buildEditMenuSubmenuItems,
  buildViewMenuSubmenuItems,
  editRoleLabels,
  viewActionLabels
} from './app-menu-chrome'

describe('app menu chrome (File/Edit Chinese labels)', () => {
  it('uses Chinese top-level File and Edit labels', () => {
    expect(APP_MENU_FILE_LABEL).toBe('文件')
    expect(APP_MENU_EDIT_LABEL).toBe('编辑')
    expect(APP_MENU_VIEW_LABEL).toBe('视图')
    expect(APP_MENU_APPEARANCE_LABEL).toBe('外观')
  })

  it('maps Edit roles to Chinese labels', () => {
    expect(editRoleLabels).toEqual({
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      selectAll: '全选'
    })
  })

  it('buildEditMenuSubmenuItems keeps Electron roles with Chinese labels', () => {
    const items = buildEditMenuSubmenuItems()
    expect(items).toEqual([
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' },
      { type: 'separator' },
      { action: 'find', label: '查找', accelerator: 'CmdOrCtrl+F' },
      { action: 'findReplace', label: '查找并替换', accelerator: 'CmdOrCtrl+Shift+H' }
    ])
  })

  it('exposes find actions to the renderer via IPC, not Electron roles', () => {
    const items = buildEditMenuSubmenuItems()
    const find = items.find((i) => 'action' in i && i.action === 'find')
    const replace = items.find((i) => 'action' in i && i.action === 'findReplace')
    expect(find).toEqual({ action: 'find', label: '查找', accelerator: 'CmdOrCtrl+F' })
    expect(replace).toEqual({ action: 'findReplace', label: '查找并替换', accelerator: 'CmdOrCtrl+Shift+H' })
  })

  it('builds a View menu with tags/backlinks but no search entry', () => {
    expect(buildViewMenuSubmenuItems()).toEqual([
      { action: 'viewFiles', label: '文件', panel: 'files' },
      { action: 'viewOutline', label: '大纲', panel: 'outline' },
      { action: 'viewTags', label: '标签', panel: 'tags' },
      { action: 'viewBacklinks', label: '反链', panel: 'links' }
    ])
    expect(viewActionLabels).toEqual({
      viewFiles: '文件',
      viewOutline: '大纲',
      viewTags: '标签',
      viewBacklinks: '反链'
    })
    expect(buildViewMenuSubmenuItems().some((i) => i.action === 'viewSearch')).toBe(false)
  })

  it('builds an 外观 menu with four checkbox toggles and correct checked-when values', () => {
    const items = buildAppearanceMenuSubmenuItems()
    expect(items).toEqual([
      { action: 'toggleFocusMode', label: '专注模式', prefsKey: 'focusMode', checkedWhen: true },
      {
        action: 'toggleTypewriterMode',
        label: '打字机模式',
        prefsKey: 'typewriterMode',
        checkedWhen: true
      },
      { action: 'toggleTheme', label: '深色主题', prefsKey: 'theme', checkedWhen: 'dark' },
      { action: 'toggleSpellcheck', label: '拼写检查', prefsKey: 'spellcheck', checkedWhen: true }
    ])
  })
})
