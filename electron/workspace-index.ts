import { parseFrontMatter } from '../src/shared/frontmatter'
import { extractWikiLinks } from '../src/shared/wiki-link'
import type { IndexedFile, WorkspaceIndex } from '../src/shared/ipc'
import { walkMarkdownFiles } from './workspace-scan'

/** Headings give search results a useful label and feed the backlinks panel. */
function extractHeadings(markdown: string): string[] {
  const headings: string[] = []
  const re = /^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(markdown)) !== null) {
    const text = match[1].trim()
    if (text !== '') headings.push(text)
  }
  return headings
}

/**
 * Build one index for tags, full-text search and backlinks. The renderer keeps
 * this snapshot in memory; scans are read-only and cheap to repeat on refresh.
 */
export async function buildWorkspaceIndex(root: string): Promise<WorkspaceIndex> {
  const files: IndexedFile[] = []
  try {
    await walkMarkdownFiles(root, ({ path, name, content }) => {
      const fm = parseFrontMatter(content)
      files.push({
        path,
        name,
        title: fm?.title ?? null,
        tags: fm?.tags ?? [],
        headings: extractHeadings(content),
        links: extractWikiLinks(content),
        content
      })
    })
    files.sort((a, b) => a.path.localeCompare(b.path))
    return { ok: true, root, files }
  } catch (e) {
    return { ok: false, error: `扫描工作区失败：${(e as Error).message}` }
  }
}
