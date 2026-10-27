import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  IpcChannels,
  type CreateEntryRequest,
  type MarkdownEditorApi,
  type MenuAction,
  type MenuSyncState,
  type RenameEntryRequest,
  type SaveFileRequest
} from '../src/shared/ipc'

const api: MarkdownEditorApi = {
  openFile: () => ipcRenderer.invoke(IpcChannels.openFile),
  saveFile: (req: SaveFileRequest) => ipcRenderer.invoke(IpcChannels.saveFile, req),
  saveFileAs: (req: SaveFileRequest) => ipcRenderer.invoke(IpcChannels.saveFileAs, req),
  setDirty: (dirty: boolean) => ipcRenderer.invoke(IpcChannels.setDirty, dirty),
  closeWindow: () => ipcRenderer.invoke(IpcChannels.closeWindow),
  onMenuAction: (handler: (action: MenuAction) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: MenuAction): void => {
      handler(action)
    }
    ipcRenderer.on(IpcChannels.onMenuAction, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannels.onMenuAction, listener)
    }
  },
  syncMenuState: (state: MenuSyncState) =>
    ipcRenderer.invoke(IpcChannels.syncMenuState, state),
  openFolder: () => ipcRenderer.invoke(IpcChannels.openFolder),
  listDir: (dirPath: string) => ipcRenderer.invoke(IpcChannels.listDir, dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke(IpcChannels.readFile, filePath),
  createEntry: (req: CreateEntryRequest) => ipcRenderer.invoke(IpcChannels.createEntry, req),
  renameEntry: (req: RenameEntryRequest) => ipcRenderer.invoke(IpcChannels.renameEntry, req),
  deleteEntry: (path: string) => ipcRenderer.invoke(IpcChannels.deleteEntry, path),
  onOpenPaths: (handler: (paths: string[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, paths: string[]): void => {
      handler(paths)
    }
    ipcRenderer.on(IpcChannels.onOpenPaths, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannels.onOpenPaths, listener)
    }
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  confirmSave: (message: string) => ipcRenderer.invoke(IpcChannels.confirmSave, message),
  onRequestClose: (handler: () => void) => {
    const listener = (): void => {
      handler()
    }
    ipcRenderer.on(IpcChannels.onRequestClose, listener)
    return () => {
      ipcRenderer.removeListener(IpcChannels.onRequestClose, listener)
    }
  },
  abortClose: () => ipcRenderer.invoke(IpcChannels.abortClose),
  getSidebarWidth: () => ipcRenderer.invoke(IpcChannels.getSidebarWidth),
  setSidebarWidth: (width: number) =>
    ipcRenderer.invoke(IpcChannels.setSidebarWidth, width)
}

contextBridge.exposeInMainWorld('api', api)
