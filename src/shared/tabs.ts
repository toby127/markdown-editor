import { fileName, isMarkdownPath, normalizePath } from './paths'
import type { DirEntry, TabModel } from './fs-types'

export type { DirEntry, TabModel }

function isUnderPath(tabPath: string, removedPath: string): boolean {
  const tab = normalizePath(tabPath)
  const removed = normalizePath(removedPath)
  if (tab === removed) return true
  const prefix = removed.endsWith('/') ? removed : removed + '/'
  return tab.startsWith(prefix)
}

export function filterDirEntries(
  entries: { name: string; path: string; isDirectory: boolean }[]
): DirEntry[] {
  return entries
    .filter((e) => e.isDirectory || isMarkdownPath(e.name) || isMarkdownPath(e.path))
    .map((e) => ({
      name: e.name,
      path: e.path,
      kind: e.isDirectory ? ('directory' as const) : ('file' as const)
    }))
}

export function openOrActivateTab(
  tabs: TabModel[],
  path: string,
  content: string,
  newId: () => string
): { tabs: TabModel[]; activeTabId: string } {
  const normalized = normalizePath(path)
  const existing = tabs.find((t) => t.path != null && normalizePath(t.path) === normalized)
  if (existing) {
    return { tabs, activeTabId: existing.id }
  }
  const id = newId()
  const tab: TabModel = {
    id,
    path,
    title: fileName(path),
    content,
    dirty: false
  }
  return { tabs: [...tabs, tab], activeTabId: id }
}

export function anyDirty(tabs: TabModel[]): boolean {
  return tabs.some((t) => t.dirty)
}

export function updateTabPath(tabs: TabModel[], fromPath: string, toPath: string): TabModel[] {
  const fromNorm = normalizePath(fromPath)
  return tabs.map((t) =>
    t.path != null && normalizePath(t.path) === fromNorm
      ? { ...t, path: toPath, title: fileName(toPath) }
      : t
  )
}

export function removeTabsUnderPath(tabs: TabModel[], removedPath: string): TabModel[] {
  return tabs.filter((t) => t.path == null || !isUnderPath(t.path, removedPath))
}
