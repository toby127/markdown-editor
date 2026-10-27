import { describe, expect, it } from 'vitest'
import { IpcChannels } from './ipc'
import type {
  CreateEntryRequest,
  MarkdownEditorApi,
  MenuAction,
  MenuSyncState,
  OpenFileResult,
  RenameEntryRequest,
  SaveFileRequest,
  SaveFileResult
} from './ipc'

describe('IpcChannels', () => {
  it('uses the exact file and menu channel names', () => {
    expect(IpcChannels).toEqual({
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
    })
  })
})

describe('MenuAction payload', () => {
  it('describes openRecent with path and kind', () => {
    const openRecent: MenuAction = {
      action: 'openRecent',
      path: '/ws/a.md',
      kind: 'file'
    }
    expect(openRecent.action).toBe('openRecent')
    expect(openRecent.path).toBe('/ws/a.md')
    expect(openRecent.kind).toBe('file')

    const clear: MenuAction = { action: 'clearRecents' }
    expect(clear.action).toBe('clearRecents')

    const create: MenuAction = { action: 'newFile' }
    expect(create.action).toBe('newFile')
  })
})

describe('MarkdownEditorApi type surface', () => {
  it('describes invoke/on methods used by preload', () => {
    const api = {
      openFile: async (): Promise<OpenFileResult> => ({ ok: false, canceled: true }),
      saveFile: async (_req: SaveFileRequest): Promise<SaveFileResult> => ({
        ok: false,
        canceled: true
      }),
      saveFileAs: async (_req: SaveFileRequest): Promise<SaveFileResult> => ({
        ok: false,
        canceled: true
      }),
      setDirty: async (_dirty: boolean): Promise<void> => undefined,
      closeWindow: async (): Promise<void> => undefined,
      onMenuAction: (handler: (action: MenuAction) => void) => {
        void handler
        return () => undefined
      },
      syncMenuState: async (_state: MenuSyncState): Promise<void> => undefined,
      openFolder: async () => ({ ok: false as const, canceled: true as const }),
      listDir: async (_dirPath: string) => ({ ok: false as const, error: 'x' }),
      readFile: async (_filePath: string) => ({ ok: false as const, error: 'x' }),
      createEntry: async (_req: CreateEntryRequest) => ({ ok: false as const, error: 'x' }),
      renameEntry: async (_req: RenameEntryRequest) => ({ ok: false as const, error: 'x' }),
      deleteEntry: async (_path: string) => ({ ok: false as const, error: 'x' }),
      onOpenPaths: (handler: (paths: string[]) => void) => {
        void handler
        return () => undefined
      },
      getPathForFile: (_file: File) => '',
      confirmSave: async (_message: string) => 'cancel' as const,
      onRequestClose: (handler: () => void) => {
        void handler
        return () => undefined
      },
      abortClose: async () => undefined,
      getSidebarWidth: async () => 220,
      setSidebarWidth: async (_width: number) => 220
    } satisfies MarkdownEditorApi

    expect(typeof api.onMenuAction).toBe('function')
    expect(typeof api.syncMenuState).toBe('function')
  })
})
