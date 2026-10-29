import { describe, expect, it } from 'vitest'
import {
  APP_MENU_EDIT_LABEL,
  APP_MENU_FILE_LABEL,
  buildEditMenuSubmenuItems,
  editRoleLabels
} from './app-menu-chrome'

describe('app menu chrome (File/Edit Chinese labels)', () => {
  it('uses Chinese top-level File and Edit labels', () => {
    expect(APP_MENU_FILE_LABEL).toBe('文件')
    expect(APP_MENU_EDIT_LABEL).toBe('编辑')
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
      { role: 'selectAll', label: '全选' }
    ])
  })
})
