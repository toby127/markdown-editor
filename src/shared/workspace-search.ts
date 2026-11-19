import type { IndexedFile } from './ipc'

export type SearchHit = {
  line: number
  snippet: string
}

export type SearchResult = {
  path: string
  name: string
  title: string | null
  titleMatch: boolean
  hits: SearchHit[]
}

const MAX_HITS_PER_FILE = 3
const MAX_FILES = 80
const MAX_SNIPPET = 180

/** Case-insensitive substring search over names, titles and file contents. */
export function searchWorkspace(
  files: IndexedFile[],
  query: string,
  options: { maxFiles?: number; maxHitsPerFile?: number } = {}
): SearchResult[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []

  const maxFiles = options.maxFiles ?? MAX_FILES
  const maxHits = options.maxHitsPerFile ?? MAX_HITS_PER_FILE
  const results: SearchResult[] = []

  for (const file of files) {
    const title = file.title ?? ''
    const titleMatch =
      file.name.toLowerCase().includes(needle) || title.toLowerCase().includes(needle)
    const hits: SearchHit[] = []

    const lines = file.content.replace(/\r\n/g, '\n').split('\n')
    for (let i = 0; i < lines.length && hits.length < maxHits; i += 1) {
      const at = lines[i].toLowerCase().indexOf(needle)
      if (at < 0) continue
      const start = Math.max(0, at - 40)
      const end = Math.min(lines[i].length, at + needle.length + 80)
      let snippet = lines[i].slice(start, end).trim()
      if (start > 0) snippet = '…' + snippet
      if (end < lines[i].length) snippet = snippet + '…'
      if (snippet.length > MAX_SNIPPET) snippet = snippet.slice(0, MAX_SNIPPET) + '…'
      hits.push({ line: i + 1, snippet })
    }

    if (!titleMatch && hits.length === 0) continue
    results.push({ path: file.path, name: file.name, title: file.title, titleMatch, hits })
  }

  results.sort((a, b) => {
    if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1
    if (a.hits.length !== b.hits.length) return b.hits.length - a.hits.length
    return a.path.localeCompare(b.path)
  })
  return results.slice(0, maxFiles)
}
