import type { IndexedFile } from './ipc'
import {
  normalizeWikiTarget,
  resolveWikiTarget,
  wikiTargetForFile,
  type WikiLinkFile
} from './wiki-link'

export type LinkTarget = {
  path: string
  name: string
  title: string | null
  contexts: string[]
}

export type WorkspaceLinks = {
  outgoing: LinkTarget[]
  backlinks: LinkTarget[]
}

const MAX_CONTEXTS = 3

function contextLines(content: string, target: string): string[] {
  const key = normalizeWikiTarget(target)
  const out: string[] = []
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.toLowerCase().includes('[[')) continue
    const hit = /\[\[([^\[\]\n]+)\]\]/g
    let match: RegExpExecArray | null
    let matches = false
    while ((match = hit.exec(line)) !== null) {
      const bracket = match[1].indexOf('|')
      const raw = bracket < 0 ? match[1] : match[1].slice(0, bracket)
      if (normalizeWikiTarget(raw) === key) {
        matches = true
        break
      }
    }
    if (matches) out.push(line.trim())
    if (out.length >= MAX_CONTEXTS) break
  }
  return out
}

/** Outgoing and incoming wiki links for the currently open file. */
export function collectWorkspaceLinks(
  files: IndexedFile[],
  currentPath: string | null
): WorkspaceLinks {
  const empty: WorkspaceLinks = { outgoing: [], backlinks: [] }
  if (!currentPath) return empty

  const fileLookup: WikiLinkFile[] = files.map((f) => ({ path: f.path, name: f.name }))
  const byPath = new Map(files.map((f) => [f.path, f]))
  const current = byPath.get(currentPath)
  if (!current) return empty

  const outgoing: LinkTarget[] = []
  const seenOut = new Set<string>()
  for (const target of current.links) {
    const path = resolveWikiTarget(target, fileLookup)
    if (!path || seenOut.has(path) || path === currentPath) continue
    seenOut.add(path)
    const linked = byPath.get(path)
    if (!linked) continue
    outgoing.push({
      path,
      name: linked.name,
      title: linked.title,
      contexts: contextLines(current.content, target)
    })
  }

  const key = wikiTargetForFile(currentPath)
  const backlinks: LinkTarget[] = []
  for (const file of files) {
    if (file.path === currentPath) continue
    const match = file.links.some((link) => normalizeWikiTarget(link) === key)
    if (!match) continue
    backlinks.push({
      path: file.path,
      name: file.name,
      title: file.title,
      contexts: contextLines(file.content, key)
    })
  }

  return { outgoing, backlinks }
}
