import type { DirEntry } from './fs-types'
import type { AppPrefs } from './prefs'

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
  setSidebarWidth: 'prefs:setSidebarWidth',
  getPrefs: 'prefs:getPrefs',
  setPrefs: 'prefs:setPrefs',
  exportHtml: 'export:html',
  exportPdf: 'export:pdf',
  scanTags: 'workspace:scanTags',
  buildIndex: 'workspace:buildIndex'
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

export type ExportResult =
  | { ok: true; path: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }

export type MenuActionName =
  | 'new'
  | 'newFile'
  | 'newFolder'
  | 'open'
  | 'openFolder'
  | 'reloadWorkspace'
  | 'save'
  | 'saveAs'
  | 'exportHtml'
  | 'exportPdf'
  | 'openRecent'
  | 'clearRecents'
  // view (sidebar panel switching)
  | 'viewFiles'
  | 'viewOutline'
  | 'viewTags'
  | 'viewBacklinks'
  // modules (writing modes / theme / spellcheck toggles)
  | 'toggleFocusMode'
  | 'toggleTypewriterMode'
  | 'toggleTheme'
  | 'toggleSpellcheck'
  // document find & replace
  | 'find'
  | 'findReplace'
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
  /** Sidebar panels currently visible; drives checkmarks in the View menu. */
  visiblePanels?: string[]
  /** Writing-mode / theme / spellcheck prefs; drives checkmarks in the 外观 menu. */
  appearancePrefs?: {
    focusMode: boolean
    typewriterMode: boolean
    theme: string
    spellcheck: boolean
  }
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
  getPrefs: () => Promise<AppPrefs>
  setPrefs: (patch: Partial<AppPrefs>) => Promise<AppPrefs>
  exportHtml: (req: ExportRequest) => Promise<ExportResult>
  exportPdf: (req: ExportRequest) => Promise<ExportResult>
  scanTags: (root: string) => Promise<WorkspaceTagsResult>
  buildIndex: (root: string) => Promise<WorkspaceIndex>
}

export type ExportRequest = { suggestedName: string; html: string }

export type TagFile = {
  path: string
  name: string
  title: string | null
  tags: string[]
}

export type WorkspaceTagsResult =
  | { ok: true; files: TagFile[] }
  | { ok: false; error: string }

export type IndexedFile = {
  path: string
  name: string
  title: string | null
  tags: string[]
  headings: string[]
  /** Normalized wiki link targets used in this file. */
  links: string[]
  content: string
}

export type WorkspaceIndex =
  | { ok: true; root: string; files: IndexedFile[] }
  | { ok: false; error: string }
