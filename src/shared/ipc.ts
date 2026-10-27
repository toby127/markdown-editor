import type { DirEntry } from './fs-types'

export const IpcChannels = {
  newFile: 'file:new',
  openFile: 'file:open',
  saveFile: 'file:save',
  saveFileAs: 'file:saveAs',
  setDirty: 'file:setDirty',
  closeWindow: 'window:close',
  onMenuAction: 'menu:action',
  syncMenuState: 'menu:syncState',
  openFolder: 'folder:open',
  listDir: 'fs:listDir',
  readFile: 'fs:readFile',
  createEntry: 'fs:createEntry',
  renameEntry: 'fs:renameEntry',
  deleteEntry: 'fs:deleteEntry',
  onOpenPaths: 'app:openPaths',
  confirmSave: 'dialog:confirmSave',
  onRequestClose: 'app:requestClose',
  abortClose: 'window:abortClose',
  getSidebarWidth: 'prefs:getSidebarWidth',
  setSidebarWidth: 'prefs:setSidebarWidth'
} as const

export type OpenFileResult =
  | { ok: true; path: string; content: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }

export type SaveFileRequest = { path: string | null; content: string }
export type SaveFileResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }

export type OpenFolderResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }

export type ListDirResult =
  | { ok: true; entries: DirEntry[] }
  | { ok: false; error: string }

export type ReadFileResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

export type CreateEntryRequest = {
  parentPath: string
  name: string
  kind: 'file' | 'directory'
}
export type CreateEntryResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export type RenameEntryRequest = { path: string; newName: string }
export type RenameEntryResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export type DeleteEntryResult = { ok: true } | { ok: false; error: string }

export type MenuActionName =
  | 'new'
  | 'newFile'
  | 'newFolder'
  | 'open'
  | 'openFolder'
  | 'save'
  | 'saveAs'
  | 'openRecent'
  | 'clearRecents'
  // paragraph
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'headingIncrease'
  | 'headingDecrease'
  | 'insertTable'
  | 'codeBlock'
  | 'mathBlock'
  | 'blockquote'
  | 'orderedList'
  | 'bulletList'
  | 'taskList'
  | 'taskToggle'
  | 'taskComplete'
  | 'taskIncomplete'
  | 'indent'
  | 'outdent'
  | 'linkReference'
  | 'footnote'
  | 'horizontalRule'
  | 'toc'
  | 'yamlFrontMatter'
  | 'htmlBlock'
  | 'deleteBlock'
  // format
  | 'bold'
  | 'italic'
  | 'underline'
  | 'inlineCode'
  | 'inlineMath'
  | 'strike'
  | 'highlight'
  | 'superscript'
  | 'subscript'
  | 'comment'
  | 'link'
  | 'image'
  | 'clearFormat'

export type MenuAction = {
  action: MenuActionName
  path?: string
  kind?: 'file' | 'directory'
}

export type MenuSyncState = {
  recents: { path: string; kind: 'file' | 'directory' }[]
  workspaceRoot: string | null
}

export type ConfirmSaveResult = 'save' | 'discard' | 'cancel'

export type MarkdownEditorApi = {
  openFile: () => Promise<OpenFileResult>
  saveFile: (req: SaveFileRequest) => Promise<SaveFileResult>
  saveFileAs: (req: SaveFileRequest) => Promise<SaveFileResult>
  setDirty: (dirty: boolean) => Promise<void>
  closeWindow: () => Promise<void>
  onMenuAction: (handler: (action: MenuAction) => void) => () => void
  syncMenuState: (state: MenuSyncState) => Promise<void>
  openFolder: () => Promise<OpenFolderResult>
  listDir: (dirPath: string) => Promise<ListDirResult>
  readFile: (filePath: string) => Promise<ReadFileResult>
  createEntry: (req: CreateEntryRequest) => Promise<CreateEntryResult>
  renameEntry: (req: RenameEntryRequest) => Promise<RenameEntryResult>
  deleteEntry: (path: string) => Promise<DeleteEntryResult>
  onOpenPaths: (handler: (paths: string[]) => void) => () => void
  getPathForFile: (file: File) => string
  confirmSave: (message: string) => Promise<ConfirmSaveResult>
  onRequestClose: (handler: () => void) => () => void
  abortClose: () => Promise<void>
  getSidebarWidth: () => Promise<number>
  setSidebarWidth: (width: number) => Promise<number>
}
