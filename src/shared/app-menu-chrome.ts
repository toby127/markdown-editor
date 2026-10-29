export type EditMenuRole = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'

export type EditMenuRoleItem = { role: EditMenuRole; label: string }
export type EditMenuSeparator = { type: 'separator' }
export type EditMenuSubmenuItem = EditMenuRoleItem | EditMenuSeparator

export const APP_MENU_FILE_LABEL = '文件'
export const APP_MENU_EDIT_LABEL = '编辑'

export const editRoleLabels: Record<EditMenuRole, string> = {
  undo: '撤销',
  redo: '重做',
  cut: '剪切',
  copy: '复制',
  paste: '粘贴',
  selectAll: '全选'
}

export function buildEditMenuSubmenuItems(): EditMenuSubmenuItem[] {
  return [
    { role: 'undo', label: editRoleLabels.undo },
    { role: 'redo', label: editRoleLabels.redo },
    { type: 'separator' },
    { role: 'cut', label: editRoleLabels.cut },
    { role: 'copy', label: editRoleLabels.copy },
    { role: 'paste', label: editRoleLabels.paste },
    { role: 'selectAll', label: editRoleLabels.selectAll }
  ]
}
