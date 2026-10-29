import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import type { DirEntry } from '../shared/fs-types'
import { fileName, parentDir } from '../shared/paths'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'

export type FileTreeProps = {
  root: string | null
  entries: DirEntry[]
  onOpenFolder: () => void
  onOpenFile: (path: string) => void
  onRefreshRequest: () => void
  loadChildren: (dirPath: string) => Promise<DirEntry[] | null>
  onCreateEntry?: (parentPath: string, name: string, kind: 'file' | 'directory') => void
  onRenameEntry?: (path: string, newName: string) => void
  onDeleteEntry?: (path: string) => void
  selectedPath?: string | null
  refreshToken?: number
}

type MenuKind = 'blank' | 'root' | 'directory' | 'file'

type MenuState = {
  x: number
  y: number
  kind: MenuKind
  path: string
  name: string
} | null

type TreeNodeProps = {
  entry: DirEntry
  depth: number
  expanded: Set<string>
  childrenMap: Record<string, DirEntry[]>
  selectedPath?: string | null
  onToggleDir: (path: string) => void
  onOpenFile: (path: string) => void
  onContextMenu: (e: MouseEvent, kind: MenuKind, path: string, name: string) => void
}

function promptName(message: string, initial = ''): string | null {
  const value = window.prompt(message, initial)
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function pathDepth(path: string): number {
  return path.split('/').filter(Boolean).length
}

function directoryStillExists(
  dirPath: string,
  root: string,
  rootEntries: DirEntry[],
  freshChildren: Record<string, DirEntry[]>
): boolean {
  const parent = parentDir(dirPath)
  const siblings = parent === root ? rootEntries : freshChildren[parent]
  if (!siblings) return false
  return siblings.some((e) => e.path === dirPath && e.kind === 'directory')
}

function FolderIcon(): JSX.Element {
  return (
    <span className="file-tree-icon" aria-hidden="true">
      📁
    </span>
  )
}

function FileIcon(): JSX.Element {
  return (
    <span className="file-tree-icon" aria-hidden="true">
      📄
    </span>
  )
}

function TreeNode({
  entry,
  depth,
  expanded,
  childrenMap,
  selectedPath,
  onToggleDir,
  onOpenFile,
  onContextMenu
}: TreeNodeProps): JSX.Element {
  const pad = { paddingLeft: `${0.5 + depth * 0.75}rem` }
  const selected = selectedPath != null && selectedPath === entry.path

  if (entry.kind === 'directory') {
    const isOpen = expanded.has(entry.path)
    const kids = childrenMap[entry.path] ?? []
    return (
      <div className="file-tree-node">
        <div
          className={`file-tree-row${selected ? ' file-tree-row-selected' : ''}`}
          style={pad}
          onContextMenu={(e) => onContextMenu(e, 'directory', entry.path, entry.name)}
        >
          <button
            type="button"
            className="file-tree-item file-tree-dir"
            aria-expanded={isOpen}
            aria-label={isOpen ? `折叠 ${entry.name}` : `展开 ${entry.name}`}
            onClick={() => onToggleDir(entry.path)}
          >
            <span className="file-tree-twist" aria-hidden="true">
              {isOpen ? '▾' : '▸'}
            </span>
            <FolderIcon />
            {entry.name}
          </button>
        </div>
        {isOpen
          ? kids.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                expanded={expanded}
                childrenMap={childrenMap}
                selectedPath={selectedPath}
                onToggleDir={onToggleDir}
                onOpenFile={onOpenFile}
                onContextMenu={onContextMenu}
              />
            ))
          : null}
      </div>
    )
  }

  return (
    <div
      className={`file-tree-row${selected ? ' file-tree-row-selected' : ''}`}
      style={pad}
      onContextMenu={(e) => onContextMenu(e, 'file', entry.path, entry.name)}
    >
      <button
        type="button"
        className="file-tree-item file-tree-file"
        onClick={() => onOpenFile(entry.path)}
      >
        <span className="file-tree-twist" aria-hidden="true" />
        <FileIcon />
        {entry.name}
      </button>
    </div>
  )
}

export default function FileTree({
  root,
  entries,
  onOpenFolder,
  onOpenFile,
  onRefreshRequest,
  loadChildren,
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  selectedPath = null,
  refreshToken = 0
}: FileTreeProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [childrenMap, setChildrenMap] = useState<Record<string, DirEntry[]>>({})
  const [rootExpanded, setRootExpanded] = useState(true)
  const [menu, setMenu] = useState<MenuState>(null)
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const childrenMapRef = useRef(childrenMap)
  childrenMapRef.current = childrenMap
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  useEffect(() => {
    if (refreshToken === 0 || !root) return
    let cancelled = false
    const rootEntries = entriesRef.current
    void (async () => {
      const paths = Array.from(expandedRef.current).sort((a, b) => pathDepth(a) - pathDepth(b))
      const updates: Record<string, DirEntry[]> = {}
      const priorChildren = childrenMapRef.current

      for (const dirPath of paths) {
        if (cancelled) return
        if (!directoryStillExists(dirPath, root, rootEntries, updates)) {
          continue
        }
        const kids = await loadChildren(dirPath)
        if (kids !== null) {
          updates[dirPath] = kids
        } else if (priorChildren[dirPath]) {
          updates[dirPath] = priorChildren[dirPath]
        }
      }
      if (!cancelled) {
        setExpanded((prev) => {
          let pruned = false
          const next = new Set(prev)
          for (const p of prev) {
            if (!directoryStillExists(p, root, rootEntries, updates)) {
              next.delete(p)
              pruned = true
            }
          }
          return pruned ? next : prev
        })
        setChildrenMap(updates)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshToken, loadChildren, root])

  const onToggleDir = useCallback(
    async (dirPath: string) => {
      const isOpen = expanded.has(dirPath)
      if (isOpen) {
        setExpanded((prev) => {
          const next = new Set(prev)
          next.delete(dirPath)
          return next
        })
        return
      }

      if (!(dirPath in childrenMap)) {
        const kids = await loadChildren(dirPath)
        if (kids !== null) {
          setChildrenMap((prev) => ({ ...prev, [dirPath]: kids }))
        }
      }

      setExpanded((prev) => {
        const next = new Set(prev)
        next.add(dirPath)
        return next
      })
    },
    [childrenMap, expanded, loadChildren]
  )

  const createWithPrompt = useCallback(
    (parentPath: string, kind: 'file' | 'directory') => {
      if (!onCreateEntry) return
      const label = kind === 'file' ? '新文件名' : '新文件夹名'
      const initial = kind === 'file' ? 'untitled.md' : 'new-folder'
      const name = promptName(label, initial)
      if (!name) return
      onCreateEntry(parentPath, name, kind)
    },
    [onCreateEntry]
  )

  const openMenu = useCallback(
    (e: MouseEvent, kind: MenuKind, path: string, name: string) => {
      e.preventDefault()
      e.stopPropagation()
      setMenu({ x: e.clientX, y: e.clientY, kind, path, name })
    },
    []
  )

  const menuItems = useCallback((): ContextMenuItem[] => {
    if (!menu || !root) return []
    const items: ContextMenuItem[] = []

    if (menu.kind === 'blank' || menu.kind === 'root' || menu.kind === 'directory') {
      if (onCreateEntry) {
        const parent =
          menu.kind === 'directory' ? menu.path : root
        items.push({
          id: 'new-file',
          label: '新建文件',
          onSelect: () => createWithPrompt(parent, 'file')
        })
        items.push({
          id: 'new-folder',
          label: '新建文件夹',
          onSelect: () => createWithPrompt(parent, 'directory')
        })
      }
      items.push({
        id: 'reload-from-disk',
        label: '从磁盘重新加载',
        onSelect: () => onRefreshRequest()
      })
    }

    if (menu.kind === 'directory' || menu.kind === 'file') {
      if (onRenameEntry) {
        items.push({
          id: 'rename',
          label: '重命名',
          onSelect: () => {
            const name = promptName(`重命名 ${menu.name}`, menu.name)
            if (name && name !== menu.name) {
              onRenameEntry(menu.path, name)
            }
          }
        })
      }
      if (onDeleteEntry) {
        items.push({
          id: 'delete',
          label: '删除',
          onSelect: () => {
            if (window.confirm(`确定删除 ${menu.name}？`)) {
              onDeleteEntry(menu.path)
            }
          }
        })
      }
    }

    return items
  }, [menu, root, onCreateEntry, onRenameEntry, onDeleteEntry, onRefreshRequest, createWithPrompt])

  if (!root) {
    return (
      <div className="file-tree file-tree-empty">
        <p className="file-tree-empty-hint">未打开工作区</p>
        <button type="button" onClick={onOpenFolder}>
          打开文件夹
        </button>
      </div>
    )
  }

  const rootLabel = fileName(root) || root

  return (
    <div
      className="file-tree"
      role="tree"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('.file-tree-row')) return
        openMenu(e, 'blank', root, rootLabel)
      }}
    >
      <div
        className="file-tree-row file-tree-root-row"
        onContextMenu={(e) => openMenu(e, 'root', root, rootLabel)}
      >
        <button
          type="button"
          className="file-tree-item file-tree-dir"
          aria-expanded={rootExpanded}
          aria-label={rootExpanded ? `折叠 ${rootLabel}` : `展开 ${rootLabel}`}
          onClick={() => setRootExpanded((v) => !v)}
        >
          <span className="file-tree-twist" aria-hidden="true">
            {rootExpanded ? '▾' : '▸'}
          </span>
          <FolderIcon />
          {rootLabel}
        </button>
      </div>
      {rootExpanded
        ? entries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={1}
              expanded={expanded}
              childrenMap={childrenMap}
              selectedPath={selectedPath}
              onToggleDir={(path) => {
                void onToggleDir(path)
              }}
              onOpenFile={onOpenFile}
              onContextMenu={openMenu}
            />
          ))
        : null}
      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems()}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  )
}
