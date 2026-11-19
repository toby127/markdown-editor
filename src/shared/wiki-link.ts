/**
 * Wiki link helpers shared by the editor node, workspace index and UI panels.
 *
 * Kept free of Electron/DOM/ProseMirror imports so the same rules apply when
 * indexing files on disk and when resolving a click in the renderer.
 */

export type ParsedWikiLink = {
  target: string
  alias: string | null
}

/** Parse the inside of `[[ ... ]]`. Returns null for an empty target. */
export function parseWikiLink(inner: string): ParsedWikiLink | null {
  const bar = inner.indexOf('|')
  const target = (bar < 0 ? inner : inner.slice(0, bar)).trim()
  if (target === '') return null
  const rawAlias = bar < 0 ? '' : inner.slice(bar + 1).trim()
  return { target, alias: rawAlias === '' ? null : rawAlias }
}

/** Normalize a link target or a file path for comparison. */
export function normalizeWikiTarget(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\.(md|markdown)$/i, '')
    .trim()
    .toLowerCase()
}

/**
 * Extract link targets from raw Markdown. Fenced and inline code are stripped
 * first so a documented `[[example]]` inside a code block is not treated as a
 * real link.
 */
export function extractWikiLinks(markdown: string): string[] {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '')
  const targets: string[] = []
  const seen = new Set<string>()
  const re = /\[\[([^\[\]\n]+)\]\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(stripped)) !== null) {
    const parsed = parseWikiLink(match[1])
    if (!parsed) continue
    const key = normalizeWikiTarget(parsed.target)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    targets.push(parsed.target)
  }
  return targets
}

/** Candidate paths for a file, most specific first. */
export function wikiPathKeys(filePath: string): string[] {
  const normalized = normalizeWikiTarget(filePath)
  const slash = normalized.lastIndexOf('/')
  const base = slash < 0 ? normalized : normalized.slice(slash + 1)
  return [normalized, base]
}

export type WikiLinkFile = { path: string; name: string }

/**
 * Resolve a wiki target against indexed files. Exact path and basename matches
 * win over suffix matches so `sub/note` does not accidentally hit `note.md`
 * in another folder.
 */
export function resolveWikiTarget(
  target: string,
  files: WikiLinkFile[]
): string | null {
  const wanted = normalizeWikiTarget(target)
  if (wanted === '') return null

  let suffixMatch: string | null = null
  for (const file of files) {
    const keys = wikiPathKeys(file.path)
    if (keys[0] === wanted || keys[1] === wanted) return file.path
    if (suffixMatch === null && keys[0].endsWith('/' + wanted)) {
      suffixMatch = file.path
    }
  }
  return suffixMatch
}

/** Identity of a file as a wiki target (basename is enough for most notes). */
export function wikiTargetForFile(filePath: string): string {
  const normalized = normalizeWikiTarget(filePath)
  const slash = normalized.lastIndexOf('/')
  return slash < 0 ? normalized : normalized.slice(slash + 1)
}
