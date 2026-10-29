import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  type BrowserWindowConstructorOptions,
  type MenuItemConstructorOptions
} from 'electron'
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import {
  IpcChannels,
  type CreateEntryRequest,
  type CreateEntryResult,
  type DeleteEntryResult,
  type ListDirResult,
  type MenuAction,
  type MenuSyncState,
  type OpenFileResult,
  type OpenFolderResult,
  type ReadFileResult,
  type RenameEntryRequest,
  type RenameEntryResult,
  type SaveFileRequest,
  type SaveFileResult
} from '../src/shared/ipc'
import {
  APP_MENU_EDIT_LABEL,
  APP_MENU_FILE_LABEL,
  buildEditMenuSubmenuItems
} from '../src/shared/app-menu-chrome'
import { buildFileMenuSpecs, type FileMenuItemSpec } from '../src/shared/file-menu'
import {
  buildFormatMenuSpecs,
  buildParagraphMenuSpecs,
  type EditorMenuItemSpec
} from '../src/shared/editor-menu'
import { markdownPathsFromArgv } from '../src/shared/paths'
import type { RecentEntry } from '../src/shared/recents'
import { filterDirEntries } from '../src/shared/tabs'
import {
  SIDEBAR_WIDTH_DEFAULT,
  keepWindowOnScreen,
  type AppPrefs,
  type WindowBounds
} from '../src/shared/prefs'
import {
  loadPrefsFromFile,
  prefsFilePath,
  savePrefsToFile,
  withSidebarWidth,
  withWindowBounds
} from '../src/shared/prefs-store'

const markdownFilters = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'All Files', extensions: ['*'] }
]

let mainWindow: BrowserWindow | null = null
let isDirty = false
/** Skip dirty prompt (after renderer finished request-close). */
let allowClose = false
/** True after main sent app:requestClose; closeWindow then destroys. */
let pendingRendererClose = false
/** Prevent stacked request-close while one is in flight. */
let closePromptOpen = false

let menuRecents: RecentEntry[] = []
let menuWorkspaceRoot: string | null = null

let appPrefs: AppPrefs = { sidebarWidth: SIDEBAR_WIDTH_DEFAULT, windowBounds: null }
let prefsPath = ''
let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null

function getPrefsPath(): string {
  if (!prefsPath) {
    prefsPath = prefsFilePath(app.getPath('userData'))
  }
  return prefsPath
}

function loadAppPrefs(): void {
  appPrefs = loadPrefsFromFile(getPrefsPath())
}

function persistAppPrefs(): void {
  savePrefsToFile(getPrefsPath(), appPrefs)
}

function captureWindowBounds(win: BrowserWindow): WindowBounds {
  const isMaximized = win.isMaximized()
  const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized
  }
}

function saveWindowBoundsNow(win: BrowserWindow | null = mainWindow): void {
  if (!win || win.isDestroyed()) return
  appPrefs = withWindowBounds(appPrefs, captureWindowBounds(win))
  persistAppPrefs()
}

function scheduleSaveWindowBounds(): void {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
  saveBoundsTimer = setTimeout(() => {
    saveBoundsTimer = null
    saveWindowBoundsNow()
  }, 300)
}

function sendMenuAction(action: MenuAction): void {
  mainWindow?.webContents.send(IpcChannels.onMenuAction, action)
}

type MenuItemSpec = FileMenuItemSpec | EditorMenuItemSpec

function specToTemplate(spec: MenuItemSpec): MenuItemConstructorOptions {
  if (spec.type === 'separator') return { type: 'separator' }
  if (spec.type === 'submenu') {
    return {
      label: spec.label,
      submenu: spec.items.map(specToTemplate)
    }
  }
  return {
    label: spec.label,
    enabled: spec.enabled,
    accelerator: spec.accelerator,
    click: () => {
      if (spec.action === 'openRecent') {
        const path = 'path' in spec ? spec.path : undefined
        const kind = 'kind' in spec ? spec.kind : undefined
        if (!path || !kind) return
        sendMenuAction({ action: 'openRecent', path, kind })
        return
      }
      sendMenuAction({ action: spec.action })
    }
  }
}

function buildAppMenu(): Menu {
  const fileSubmenu = buildFileMenuSpecs({
    workspaceRoot: menuWorkspaceRoot,
    recents: menuRecents
  }).map(specToTemplate)

  const paragraphSubmenu = buildParagraphMenuSpecs().map(specToTemplate)
  const formatSubmenu = buildFormatMenuSpecs().map(specToTemplate)

  return Menu.buildFromTemplate([
    { label: APP_MENU_FILE_LABEL, submenu: fileSubmenu },
    { label: APP_MENU_EDIT_LABEL, submenu: buildEditMenuSubmenuItems() },
    { label: '段落', submenu: paragraphSubmenu },
    { label: '格式', submenu: formatSubmenu }
  ])
}

function applyMenuState(state: MenuSyncState): void {
  menuRecents = state.recents
  menuWorkspaceRoot = state.workspaceRoot
  Menu.setApplicationMenu(buildAppMenu())
}

function forceCloseWindow(): void {
  allowClose = true
  isDirty = false
  pendingRendererClose = false
  closePromptOpen = false
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
  }
}

function requestRendererClose(): void {
  if (closePromptOpen || pendingRendererClose) return
  closePromptOpen = true
  pendingRendererClose = true
  mainWindow?.webContents.send(IpcChannels.onRequestClose)
}


/** Paths waiting for the renderer to finish loading / subscribe. */
let pendingOpenPaths: string[] = []

function sendOpenPaths(paths: string[]): void {
  if (paths.length === 0) return
  pendingOpenPaths.push(...paths)
  flushPendingOpenPaths()
}

function flushPendingOpenPaths(): void {
  if (pendingOpenPaths.length === 0) return
  if (!mainWindow || mainWindow.isDestroyed()) return

  const deliver = (): void => {
    if (!mainWindow || mainWindow.isDestroyed() || pendingOpenPaths.length === 0) {
      return
    }
    const payload = pendingOpenPaths
    pendingOpenPaths = []
    mainWindow.webContents.send(IpcChannels.onOpenPaths, payload)
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.once('did-finish-load', () => {
      // React onOpenPaths subscribe runs in useEffect after first paint
      setTimeout(deliver, 50)
    })
  } else {
    deliver()
  }
}

function createWindow(): void {
  const defaultWidth = 960
  const defaultHeight = 720
  const windowOptions: BrowserWindowConstructorOptions = {
    width: defaultWidth,
    height: defaultHeight,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  }

  const saved = appPrefs.windowBounds
  if (saved) {
    const display = screen.getDisplayMatching({
      x: saved.x,
      y: saved.y,
      width: saved.width,
      height: saved.height
    })
    const bounded = keepWindowOnScreen(saved, display.workArea)
    windowOptions.x = bounded.x
    windowOptions.y = bounded.y
    windowOptions.width = bounded.width
    windowOptions.height = bounded.height
  }

  mainWindow = new BrowserWindow(windowOptions)

  if (saved?.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('resize', () => {
    scheduleSaveWindowBounds()
  })
  mainWindow.on('move', () => {
    scheduleSaveWindowBounds()
  })
  mainWindow.on('maximize', () => {
    scheduleSaveWindowBounds()
  })
  mainWindow.on('unmaximize', () => {
    scheduleSaveWindowBounds()
  })

  mainWindow.on('close', (e) => {
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer)
      saveBoundsTimer = null
    }
    saveWindowBoundsNow(mainWindow)
    if (allowClose || !isDirty) {
      return
    }
    e.preventDefault()
    requestRendererClose()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    allowClose = false
    pendingRendererClose = false
    closePromptOpen = false
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function saveFileAs(content: string): Promise<SaveFileResult> {
  const win = mainWindow ?? undefined
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    filters: markdownFilters
  })
  if (canceled || !filePath) {
    return { ok: false, canceled: true }
  }
  try {
    await fs.writeFile(filePath, content, 'utf8')
    return { ok: true, path: filePath }
  } catch (e) {
    return { ok: false, error: `保存失败：${(e as Error).message}` }
  }
}

function registerFileHandlers(): void {
  ipcMain.handle(IpcChannels.openFile, async (): Promise<OpenFileResult> => {
    const win = mainWindow ?? undefined
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: markdownFilters,
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) {
      return { ok: false, canceled: true }
    }
    try {
      const content = await fs.readFile(filePaths[0], 'utf8')
      return { ok: true, path: filePaths[0], content }
    } catch (e) {
      return { ok: false, error: `打开失败：${(e as Error).message}` }
    }
  })

  ipcMain.handle(
    IpcChannels.saveFile,
    async (_event, req: SaveFileRequest): Promise<SaveFileResult> => {
      let result: SaveFileResult
      if (!req.path) {
        result = await saveFileAs(req.content)
      } else {
        try {
          await fs.writeFile(req.path, req.content, 'utf8')
          result = { ok: true, path: req.path }
        } catch (e) {
          result = { ok: false, error: `保存失败：${(e as Error).message}` }
        }
      }
      return result
    }
  )

  ipcMain.handle(
    IpcChannels.saveFileAs,
    async (_event, req: SaveFileRequest): Promise<SaveFileResult> => {
      const result = await saveFileAs(req.content)
      return result
    }
  )

  ipcMain.handle(IpcChannels.setDirty, async (_event, dirty: boolean): Promise<void> => {
    isDirty = dirty
  })

  ipcMain.handle(IpcChannels.closeWindow, async (): Promise<void> => {
    // Renderer calls this after handling app:requestClose (all dirty tabs resolved).
    if (pendingRendererClose) {
      forceCloseWindow()
    }
  })

  // Renderer aborted per-tab prompts: clear close lock so the user can retry.
  ipcMain.handle(IpcChannels.abortClose, async (): Promise<void> => {
    pendingRendererClose = false
    closePromptOpen = false
  })

  ipcMain.handle(
    IpcChannels.confirmSave,
    async (_event, message: string): Promise<'save' | 'discard' | 'cancel'> => {
      const win = mainWindow ?? undefined
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['保存', '不保存', '取消'],
        defaultId: 0,
        cancelId: 2,
        title: '未保存的更改',
        message
      })
      if (response === 0) return 'save'
      if (response === 1) return 'discard'
      return 'cancel'
    }
  )

  ipcMain.handle(IpcChannels.openFolder, async (): Promise<OpenFolderResult> => {
    const win = mainWindow ?? undefined
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
      })
      if (canceled || !filePaths[0]) {
        return { ok: false, canceled: true }
      }
      return { ok: true, path: filePaths[0] }
    } catch (e) {
      return { ok: false, error: `打开文件夹失败：${(e as Error).message}` }
    }
  })

  ipcMain.handle(IpcChannels.listDir, async (_event, dirPath: string): Promise<ListDirResult> => {
    try {
      const names = await fs.readdir(dirPath)
      const raw: { name: string; path: string; isDirectory: boolean }[] = []
      for (const name of names) {
        const full = join(dirPath, name)
        try {
          const st = await fs.stat(full)
          raw.push({ name, path: full, isDirectory: st.isDirectory() })
        } catch {
          // skip unreadable entries
        }
      }
      const entries = filterDirEntries(raw).sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
      return { ok: true, entries }
    } catch (e) {
      return { ok: false, error: `读取目录失败：${(e as Error).message}` }
    }
  })

  ipcMain.handle(IpcChannels.readFile, async (_event, filePath: string): Promise<ReadFileResult> => {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return { ok: true, content }
    } catch (e) {
      return { ok: false, error: `读取失败：${(e as Error).message}` }
    }
  })

  ipcMain.handle(
    IpcChannels.createEntry,
    async (_event, req: CreateEntryRequest): Promise<CreateEntryResult> => {
      const target = join(req.parentPath, req.name)
      try {
        try {
          await fs.access(target)
          return { ok: false, error: '已存在同名项' }
        } catch {
          // does not exist — proceed
        }
        if (req.kind === 'directory') {
          await fs.mkdir(target)
        } else {
          await fs.writeFile(target, '', 'utf8')
        }
        return { ok: true, path: target }
      } catch (e) {
        return { ok: false, error: `创建失败：${(e as Error).message}` }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.renameEntry,
    async (_event, req: RenameEntryRequest): Promise<RenameEntryResult> => {
      const target = join(dirname(req.path), req.newName)
      try {
        try {
          await fs.access(target)
          return { ok: false, error: '已存在同名项' }
        } catch {
          // destination free
        }
        await fs.rename(req.path, target)
        return { ok: true, path: target }
      } catch (e) {
        return { ok: false, error: `重命名失败：${(e as Error).message}` }
      }
    }
  )

  ipcMain.handle(IpcChannels.deleteEntry, async (_event, path: string): Promise<DeleteEntryResult> => {
    try {
      await fs.rm(path, { recursive: true, force: false })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: `删除失败：${(e as Error).message}` }
    }
  })

  ipcMain.handle(IpcChannels.syncMenuState, async (_event, state: MenuSyncState): Promise<void> => {
    applyMenuState(state)
  })

  ipcMain.handle(IpcChannels.getSidebarWidth, async (): Promise<number> => {
    return appPrefs.sidebarWidth
  })

  ipcMain.handle(
    IpcChannels.setSidebarWidth,
    async (_event, width: unknown): Promise<number> => {
      appPrefs = withSidebarWidth(appPrefs, width)
      persistAppPrefs()
      return appPrefs.sidebarWidth
    }
  )
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    sendOpenPaths(markdownPathsFromArgv(argv))
  })

  app.whenReady().then(() => {
    loadAppPrefs()
    registerFileHandlers()
    Menu.setApplicationMenu(buildAppMenu())
    createWindow()

    const startupPaths = markdownPathsFromArgv(process.argv)
    if (startupPaths.length > 0) {
      sendOpenPaths(startupPaths)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
