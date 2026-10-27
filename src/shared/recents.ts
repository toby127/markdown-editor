import { normalizePath } from './paths'

export const RECENTS_STORAGE_KEY = 'markdown-editor.recents'
export const RECENTS_MAX = 10

export type RecentEntry = { path: string; kind: 'file' | 'directory' }

export function recordRecent(
  list: RecentEntry[],
  entry: RecentEntry,
  max: number = RECENTS_MAX
): RecentEntry[] {
  const path = normalizePath(entry.path)
  const next = [{ path, kind: entry.kind }, ...list.filter((e) => normalizePath(e.path) !== path)]
  return next.slice(0, max)
}

export function removeRecent(list: RecentEntry[], path: string): RecentEntry[] {
  const n = normalizePath(path)
  return list.filter((e) => normalizePath(e.path) !== n)
}

export function parseRecentsJson(raw: string | null): RecentEntry[] {
  if (raw == null || raw === '') return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    const out: RecentEntry[] = []
    for (const item of data) {
      if (!item || typeof item !== 'object') continue
      const path = (item as { path?: unknown }).path
      const kind = (item as { kind?: unknown }).kind
      if (typeof path !== 'string' || (kind !== 'file' && kind !== 'directory')) continue
      out.push({ path: normalizePath(path), kind })
    }
    return out.slice(0, RECENTS_MAX)
  } catch {
    return []
  }
}

export function serializeRecents(list: RecentEntry[]): string {
  return JSON.stringify(list.slice(0, RECENTS_MAX))
}
