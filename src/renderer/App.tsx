import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { applyEditorMenuAction } from '../shared/editor-menu'
import type { MenuAction, MenuActionName } from '../shared/ipc'
import type { DirEntry, TabModel } from '../shared/fs-types'
import {
  anyDirty,
  openOrActivateTab,
  removeTabsUnderPath,
  updateTabPath
} from '../shared/tabs'
import { fileName, normalizePath, openPathsMeta, parentDir } from '../shared/paths'
import {
  RECENTS_STORAGE_KEY,
  parseRecentsJson,
  recordRecent,
  removeRecent,
  serializeRecents,
  type RecentEntry
} from '../shared/recents'
import {
  SIDEBAR_WIDTH_DEFAULT,
  clampSidebarWidth
} from '../shared/prefs'
import Editor, { type EditorHandle } from './Editor'
import Sidebar from './Sidebar'
import TabBar from './TabBar'

const INITIAL_MARKDOWN = ''

const EDITOR_MENU_ACTIONS = new Set<MenuActionName>([
  'paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
  'headingIncrease', 'headingDecrease', 'insertTable', 'codeBlock', 'mathBlock',
  'blockquote', 'orderedList', 'bulletList', 'taskList', 'taskToggle', 'taskComplete',
  'taskIncomplete', 'indent', 'outdent', 'linkReference', 'footnote', 'horizontalRule',
  'toc', 'yamlFrontMatter', 'htmlBlock', 'deleteBlock',
  'bold', 'italic', 'underline', 'inlineCode', 'inlineMath', 'strike', 'highlight',
  'superscript', 'subscript', 'comment', 'link', 'image', 'clearFormat'
])

function newTabId(): string {
  return crypto.randomUUID()
}

function createUntitledTab(id: string = newTabId()): TabModel {
  return {
    id,
    path: null,
    title: '未命名',
    content: INITIAL_MARKDOWN,
    dirty: false
  }
}

function promptName(message: string, initial = ''): string | null {
  const value = window.prompt(message, initial)
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function remapTabsAfterRename(tabs: TabModel[], fromPath: string, toPath: string): TabModel[] {
  const exact = updateTabPath(tabs, fromPath, toPath)
  const fromNorm = normalizePath(fromPath)
  const toNorm = normalizePath(toPath)
  const prefix = fromNorm.endsWith('/') ? fromNorm : fromNorm + '/'
  return exact.map((t) => {
    if (!t.path) return t
    const p = normalizePath(t.path)
    if (p.startsWith(prefix)) {
      const nextPath = toNorm + p.slice(fromNorm.length)
      return { ...t, path: nextPath, title: fileName(nextPath) }
    }
    return t
  })
}

export default function App(): JSX.Element {
  const [tabs, setTabs] = useState<TabModel[]>([])
  const [activeTabId, setActiveTabId] = useState('')
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [rootEntries, setRootEntries] = useState<DirEntry[]>([])
  const [treeEpoch, setTreeEpoch] = useState(0)
  const [treeRefreshToken, setTreeRefreshToken] = useState(0)
  const [recents, setRecents] = useState<RecentEntry[]>(() =>
    parseRecentsJson(localStorage.getItem(RECENTS_STORAGE_KEY))
  )
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH_DEFAULT)

  const tabsRef = useRef(tabs)
  const activeTabIdRef = useRef(activeTabId)
  const handlingCloseRef = useRef(false)
  const editorRef = useRef<EditorHandle>(null)
  const sidebarWidthRef = useRef(sidebarWidth)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(SIDEBAR_WIDTH_DEFAULT)

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  useEffect(() => {
    let cancelled = false
    void window.api.getSidebarWidth().then((width) => {
      if (cancelled) return
      setSidebarWidth(clampSidebarWidth(width))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSplitterPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragStartXRef.current = event.clientX
    dragStartWidthRef.current = sidebarWidthRef.current

    const onMove = (moveEvent: PointerEvent): void => {
      const next = clampSidebarWidth(
        dragStartWidthRef.current + (moveEvent.clientX - dragStartXRef.current)
      )
      sidebarWidthRef.current = next
      setSidebarWidth(next)
    }

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const width = clampSidebarWidth(sidebarWidthRef.current)
      setSidebarWidth(width)
      void window.api.setSidebarWidth(width)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [])

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])
  useEffect(() => {
    activeTabIdRef.current = activeTabId
  }, [activeTabId])

  useEffect(() => {
    localStorage.setItem(RECENTS_STORAGE_KEY, serializeRecents(recents))
  }, [recents])

  useEffect(() => {
    void window.api.syncMenuState({ recents, workspaceRoot })
  }, [recents, workspaceRoot])

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  const syncWindowDirty = useCallback((nextTabs: TabModel[]) => {
    void window.api.setDirty(anyDirty(nextTabs))
  }, [])

  const loadRootEntries = useCallback(
    async (root: string, options?: { preserveOnError?: boolean }) => {
      const result = await window.api.listDir(root)
      if (!result.ok) {
        window.alert(result.error)
        if (!options?.preserveOnError) {
          setRootEntries([])
        }
        return
      }
      setRootEntries(result.entries)
    },
    []
  )

  const refreshTree = useCallback(async () => {
    if (!workspaceRoot) return
    await loadRootEntries(workspaceRoot, { preserveOnError: true })
    setTreeRefreshToken((n) => n + 1)
  }, [workspaceRoot, loadRootEntries])

  const handleChangeMarkdown = useCallback(
    (content: string) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content } : t))
      )
    },
    [activeTabId]
  )

  const handleDirty = useCallback(() => {
    setTabs((prev) => {
      const next = prev.map((t) =>
        t.id === activeTabId ? { ...t, dirty: true } : t
      )
      syncWindowDirty(next)
      return next
    })
  }, [activeTabId, syncWindowDirty])

  const handleNew = useCallback(() => {
    const tab = createUntitledTab()
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }, [])

  const applyWorkspaceRoot = useCallback(
    async (root: string) => {
      setWorkspaceRoot(root)
      await loadRootEntries(root)
      setTreeEpoch((n) => n + 1)
    },
    [loadRootEntries]
  )

  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result.ok) {
      if ('error' in result) {
        window.alert(result.error)
      }
      return
    }
    setTabs((prev) => {
      const { tabs: nextTabs, activeTabId: nextId } = openOrActivateTab(
        prev,
        result.path,
        result.content,
        newTabId
      )
      setActiveTabId(nextId)
      syncWindowDirty(nextTabs)
      return nextTabs
    })
    setRecents((r) => recordRecent(r, { path: result.path, kind: 'file' }))
    if (!workspaceRoot) {
      await applyWorkspaceRoot(parentDir(result.path))
    }
  }, [syncWindowDirty, workspaceRoot, applyWorkspaceRoot])

  const handleOpenFolder = useCallback(async () => {
    const result = await window.api.openFolder()
    if (!result.ok) {
      if ('error' in result) {
        window.alert(result.error)
      }
      return
    }
    await applyWorkspaceRoot(result.path)
    setRecents((r) => recordRecent(r, { path: result.path, kind: 'directory' }))
  }, [applyWorkspaceRoot])

  const handleOpenFileFromTree = useCallback(
    async (filePath: string) => {
      const result = await window.api.readFile(filePath)
      if (!result.ok) {
        window.alert(result.error)
        return
      }
      setTabs((prev) => {
        const { tabs: nextTabs, activeTabId: nextId } = openOrActivateTab(
          prev,
          filePath,
          result.content,
          newTabId
        )
        setActiveTabId(nextId)
        syncWindowDirty(nextTabs)
        return nextTabs
      })
      setRecents((r) => recordRecent(r, { path: filePath, kind: 'file' }))
    },
    [syncWindowDirty]
  )

  const openPaths = useCallback(
    async (paths: string[]) => {
      const { root, files } = openPathsMeta(paths)
      if (files.length === 0) {
        if (paths.length > 0) {
          window.alert('仅支持 Markdown 文件')
        }
        return
      }
      if (root && !workspaceRoot) {
        await applyWorkspaceRoot(root)
      }
      for (const filePath of files) {
        const result = await window.api.readFile(filePath)
        if (!result.ok) {
          window.alert(result.error)
          continue
        }
        setTabs((prev) => {
          const { tabs: nextTabs, activeTabId: nextId } = openOrActivateTab(
            prev,
            filePath,
            result.content,
            newTabId
          )
          setActiveTabId(nextId)
          syncWindowDirty(nextTabs)
          return nextTabs
        })
        setRecents((r) => recordRecent(r, { path: filePath, kind: 'file' }))
      }
    },
    [workspaceRoot, applyWorkspaceRoot, syncWindowDirty]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const dropped = Array.from(e.dataTransfer.files)
      const paths = dropped
        .map((file) => {
          try {
            return window.api.getPathForFile(file)
          } catch {
            return (file as File & { path?: string }).path ?? ''
          }
        })
        .filter((p) => p.length > 0)
      void openPaths(paths)
    },
    [openPaths]
  )

  const loadChildren = useCallback(async (dirPath: string): Promise<DirEntry[]> => {
    const result = await window.api.listDir(dirPath)
    if (!result.ok) {
      window.alert(result.error)
      return []
    }
    return result.entries
  }, [])

  const handleRefreshRequest = useCallback(() => {
    void refreshTree()
  }, [refreshTree])

  const saveTab = useCallback(async (tab: TabModel): Promise<TabModel | null> => {
    const result = await window.api.saveFile({ path: tab.path, content: tab.content })
    if (!result.ok) {
      if ('error' in result) {
        window.alert(result.error)
      }
      return null
    }
    return {
      ...tab,
      path: result.path,
      title: fileName(result.path),
      dirty: false
    }
  }, [])

  const handleSave = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    const saved = await saveTab(tab)
    if (!saved) return
    setTabs((prev) => {
      const next = prev.map((t) => (t.id === saved.id ? saved : t))
      syncWindowDirty(next)
      return next
    })
    // No-op in main unless a dirty-close is awaiting confirmation.
    void window.api.closeWindow()
  }, [saveTab, syncWindowDirty])

  const handleSaveAs = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    const result = await window.api.saveFileAs({ path: tab.path, content: tab.content })
    if (!result.ok) {
      if ('error' in result) {
        window.alert(result.error)
      }
      return
    }
    setTabs((prev) => {
      const next = prev.map((t) =>
        t.id === tab.id
          ? {
              ...t,
              path: result.path,
              title: fileName(result.path),
              dirty: false
            }
          : t
      )
      syncWindowDirty(next)
      return next
    })
    void window.api.closeWindow()
  }, [syncWindowDirty])

  const resolveDirtyTab = useCallback(
    async (tab: TabModel): Promise<'ok' | 'cancel'> => {
      if (!tab.dirty) return 'ok'
      const choice = await window.api.confirmSave(
        `「${tab.title}」有未保存的更改，是否保存？`
      )
      if (choice === 'cancel') return 'cancel'
      // Discard: do not clear dirty here. Multi-tab close/delete may still cancel;
      // callers clear dirty (or remove the tab) only after the whole operation commits.
      if (choice === 'discard') {
        return 'ok'
      }
      const latest = tabsRef.current.find((t) => t.id === tab.id) ?? tab
      const saved = await saveTab(latest)
      if (!saved) return 'cancel'
      setTabs((prev) => {
        const next = prev.map((t) => (t.id === saved.id ? saved : t))
        syncWindowDirty(next)
        tabsRef.current = next
        return next
      })
      return 'ok'
    },
    [saveTab, syncWindowDirty]
  )

  const closeTabById = useCallback(
    (id: string, nextTabs: TabModel[]) => {
      const remaining = nextTabs.filter((t) => t.id !== id)
      let nextActive = activeTabIdRef.current

      if (remaining.length === 0) {
        nextActive = ''
      } else if (id === activeTabIdRef.current) {
        const idx = nextTabs.findIndex((t) => t.id === id)
        nextActive = remaining[Math.min(Math.max(idx, 0), remaining.length - 1)].id
      }

      setTabs(remaining)
      setActiveTabId(nextActive)
      syncWindowDirty(remaining)
      tabsRef.current = remaining
    },
    [syncWindowDirty]
  )

  const handleCloseTab = useCallback(
    async (id: string) => {
      const tab = tabsRef.current.find((t) => t.id === id)
      if (!tab) return
      if (tab.dirty) {
        const result = await resolveDirtyTab(tab)
        if (result === 'cancel') return
      }
      closeTabById(id, tabsRef.current)
    },
    [resolveDirtyTab, closeTabById]
  )

  const handleCreateEntry = useCallback(
    async (parentPath: string, name: string, kind: 'file' | 'directory') => {
      const result = await window.api.createEntry({ parentPath, name, kind })
      if (!result.ok) {
        window.alert(result.error)
        return
      }
      await refreshTree()
      if (kind === 'file') {
        setTabs((prev) => {
          const { tabs: nextTabs, activeTabId: nextId } = openOrActivateTab(
            prev,
            result.path,
            '',
            newTabId
          )
          setActiveTabId(nextId)
          syncWindowDirty(nextTabs)
          return nextTabs
        })
      }
    },
    [refreshTree, syncWindowDirty]
  )

  const handleMenuNewFile = useCallback(async () => {
    if (!workspaceRoot) return
    const name = promptName('新文件名', 'untitled.md')
    if (!name) return
    await handleCreateEntry(workspaceRoot, name, 'file')
  }, [workspaceRoot, handleCreateEntry])

  const handleMenuNewFolder = useCallback(async () => {
    if (!workspaceRoot) return
    const name = promptName('新文件夹名', 'new-folder')
    if (!name) return
    await handleCreateEntry(workspaceRoot, name, 'directory')
  }, [workspaceRoot, handleCreateEntry])

  const handleOpenRecent = useCallback(
    async (path: string, kind: 'file' | 'directory') => {
      if (kind === 'file') {
        const result = await window.api.readFile(path)
        if (!result.ok) {
          window.alert(result.error)
          setRecents((r) => removeRecent(r, path))
          return
        }
        setTabs((prev) => {
          const { tabs: nextTabs, activeTabId: nextId } = openOrActivateTab(
            prev,
            path,
            result.content,
            newTabId
          )
          setActiveTabId(nextId)
          syncWindowDirty(nextTabs)
          return nextTabs
        })
        setRecents((r) => recordRecent(r, { path, kind: 'file' }))
        if (!workspaceRoot) {
          await applyWorkspaceRoot(parentDir(path))
        }
        return
      }
      const listed = await window.api.listDir(path)
      if (!listed.ok) {
        window.alert(listed.error)
        setRecents((r) => removeRecent(r, path))
        return
      }
      await applyWorkspaceRoot(path)
      setRecents((r) => recordRecent(r, { path, kind: 'directory' }))
    },
    [applyWorkspaceRoot, syncWindowDirty, workspaceRoot]
  )

  const handleClearRecents = useCallback(() => {
    setRecents([])
  }, [])

  const handleRenameEntry = useCallback(
    async (path: string, newName: string) => {
      const result = await window.api.renameEntry({ path, newName })
      if (!result.ok) {
        window.alert(result.error)
        return
      }
      setTabs((prev) => {
        const next = remapTabsAfterRename(prev, path, result.path)
        syncWindowDirty(next)
        tabsRef.current = next
        return next
      })
      await refreshTree()
    },
    [refreshTree, syncWindowDirty]
  )

  const handleDeleteEntry = useCallback(
    async (path: string) => {
      const pathNorm = normalizePath(path)
      const prefix = pathNorm.endsWith('/') ? pathNorm : pathNorm + '/'
      const affected = tabsRef.current.filter((t) => {
        if (t.path == null) return false
        const p = normalizePath(t.path)
        return p === pathNorm || p.startsWith(prefix)
      })
      for (const tab of affected) {
        if (!tab.dirty) continue
        const result = await resolveDirtyTab(tab)
        if (result === 'cancel') return
      }

      const del = await window.api.deleteEntry(path)
      if (!del.ok) {
        window.alert(del.error)
        return
      }

      setTabs((prev) => {
        const next = removeTabsUnderPath(prev, path)
        let nextActive = activeTabIdRef.current
        if (next.length === 0) {
          nextActive = ''
        } else if (!next.some((t) => t.id === nextActive)) {
          nextActive = next[0].id
        }
        setActiveTabId(nextActive)
        syncWindowDirty(next)
        tabsRef.current = next
        return next
      })
      await refreshTree()
    },
    [resolveDirtyTab, refreshTree, syncWindowDirty]
  )

  const handleRequestClose = useCallback(async () => {
    if (handlingCloseRef.current) return
    handlingCloseRef.current = true
    try {
      const dirtyTabs = tabsRef.current.filter((t) => t.dirty)
      for (const tab of dirtyTabs) {
        // Re-read latest in case prior save updated state
        const latest = tabsRef.current.find((t) => t.id === tab.id) ?? tab
        if (!latest.dirty) continue
        const result = await resolveDirtyTab(latest)
        if (result === 'cancel') {
          await window.api.abortClose()
          return
        }
      }
      const cleaned = tabsRef.current.map((t) => ({ ...t, dirty: false }))
      setTabs(cleaned)
      tabsRef.current = cleaned
      await window.api.setDirty(false)
      await window.api.closeWindow()
    } finally {
      handlingCloseRef.current = false
    }
  }, [resolveDirtyTab])

  useEffect(() => {
    const unsubscribe = window.api.onMenuAction((msg: MenuAction) => {
      switch (msg.action) {
        case 'new':
          handleNew()
          break
        case 'newFile':
          void handleMenuNewFile()
          break
        case 'newFolder':
          void handleMenuNewFolder()
          break
        case 'open':
          void handleOpen()
          break
        case 'openFolder':
          void handleOpenFolder()
          break
        case 'reloadWorkspace':
          void refreshTree()
          break
        case 'save':
          void handleSave()
          break
        case 'saveAs':
          void handleSaveAs()
          break
        case 'openRecent':
          if (msg.path && msg.kind) void handleOpenRecent(msg.path, msg.kind)
          break
        case 'clearRecents':
          handleClearRecents()
          break
        default: {
          if (EDITOR_MENU_ACTIONS.has(msg.action)) {
            const ed = editorRef.current?.getEditor() ?? null
            if (ed) applyEditorMenuAction(ed, msg.action)
          }
          break
        }
      }
    })
    return unsubscribe
  }, [
    handleNew,
    handleMenuNewFile,
    handleMenuNewFolder,
    handleOpen,
    handleOpenFolder,
    refreshTree,
    handleSave,
    handleSaveAs,
    handleOpenRecent,
    handleClearRecents
  ])

  useEffect(() => {
    const unsubscribe = window.api.onRequestClose(() => {
      void handleRequestClose()
    })
    return unsubscribe
  }, [handleRequestClose])

  useEffect(() => {
    const unsubscribe = window.api.onOpenPaths((paths) => {
      void openPaths(paths)
    })
    return unsubscribe
  }, [openPaths])

  return (
    <div className="app-shell" onDragOver={handleDragOver} onDrop={handleDrop}>
      <aside className="file-tree-sidebar" style={{ width: sidebarWidth }}>
        <Sidebar
          treeKey={`${workspaceRoot ?? 'empty'}-${treeEpoch}`}
          treeRefreshToken={treeRefreshToken}
          root={workspaceRoot}
          entries={rootEntries}
          selectedPath={activeTab?.path ?? null}
          onOpenFolder={() => {
            void handleOpenFolder()
          }}
          onOpenFile={(path) => {
            void handleOpenFileFromTree(path)
          }}
          onRefreshRequest={handleRefreshRequest}
          loadChildren={loadChildren}
          onCreateEntry={(parentPath, name, kind) => {
            void handleCreateEntry(parentPath, name, kind)
          }}
          onRenameEntry={(path, newName) => {
            void handleRenameEntry(path, newName)
          }}
          onDeleteEntry={(path) => {
            void handleDeleteEntry(path)
          }}
          outlineMarkdown={activeTab?.content ?? null}
          onOutlineJump={(i) => {
            editorRef.current?.jumpToHeading(i)
          }}
        />
        <div
          className="sidebar-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-label="调整侧边栏宽度"
          style={{ cursor: 'col-resize' }}
          onPointerDown={handleSplitterPointerDown}
        />
      </aside>
      <div className="app-main">
        {activeTab ? (
          <>
            <TabBar
              tabs={tabs}
              activeTabId={activeTab.id}
              onSelect={setActiveTabId}
              onClose={(id) => {
                void handleCloseTab(id)
              }}
            />
            <Editor
              key={activeTab.id}
              ref={editorRef}
              content={activeTab.content}
              onChangeMarkdown={handleChangeMarkdown}
              onDirty={handleDirty}
            />
          </>
        ) : (
          <div className="empty-editor">
            <button type="button" onClick={() => handleNew()}>
              新建文件
            </button>
            <button
              type="button"
              onClick={() => {
                void handleOpen()
              }}
            >
              打开文件
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
