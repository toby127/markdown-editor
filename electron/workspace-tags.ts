import { parseFrontMatter } from '../src/shared/frontmatter'
import type { TagFile, WorkspaceTagsResult } from '../src/shared/ipc'
import { walkMarkdownFiles } from './workspace-scan'

/**
 * Collect Front Matter tags. Kept as a separate IPC entry point for backwards
 * compatibility; it now shares the exact same read-only walk as the full index.
 */
export async function scanWorkspaceTags(root: string): Promise<WorkspaceTagsResult> {
  const files: TagFile[] = []
  try {
    await walkMarkdownFiles(root, ({ path, name, content }) => {
      const fm = parseFrontMatter(content)
      if (fm && fm.tags.length > 0) {
        files.push({ path, name, title: fm.title, tags: fm.tags })
      }
    })
    files.sort((a, b) => a.path.localeCompare(b.path))
    return { ok: true, files }
  } catch (e) {
    return { ok: false, error: `扫描标签失败：${(e as Error).message}` }
  }
}
