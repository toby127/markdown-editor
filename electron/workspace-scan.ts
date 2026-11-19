import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/** Directories that must never be walked (build output, VCS, tool state). */
export const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'out', 'release', 'release-2026',
  'release-2026-final', 'release-2026-c', '.workbuddy'
])

export const MAX_DEPTH = 12
export const MAX_FILE_BYTES = 512 * 1024

export type MarkdownFile = {
  path: string
  name: string
  content: string
}

/**
 * Shared read-only workspace walk. Both the tag index and the full search index
 * go through here so skip rules and size limits can never drift apart.
 * Read-only by design: a scanner must not hold workspace files open longer
 * than needed or write to them (see the app.asar lock investigation).
 */
export async function walkMarkdownFiles(
  root: string,
  onFile: (file: MarkdownFile) => void
): Promise<void> {
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return
    let names: string[]
    try {
      names = await fs.readdir(dir)
    } catch {
      return
    }
    for (const name of names) {
      if (SKIP_DIRS.has(name.toLowerCase())) continue
      const full = join(dir, name)
      try {
        const stat = await fs.stat(full)
        if (stat.isDirectory()) {
          await walk(full, depth + 1)
        } else if (/\.(md|markdown)$/i.test(name) && stat.size <= MAX_FILE_BYTES) {
          const content = await fs.readFile(full, 'utf8')
          onFile({ path: full, name, content })
        }
      } catch {
        // unreadable entries are skipped, not fatal
      }
    }
  }

  await walk(root, 0)
}
