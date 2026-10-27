export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function isMarkdownPath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

export function parentDir(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  const normalized = normalizePath(path)
  const idx = normalized.lastIndexOf('/')
  if (idx < 0) return ''
  if (idx === 0) return '/'
  const parent = normalized.slice(0, idx)
  return sep === '\\' ? parent.replace(/\//g, '\\') : parent
}

export function fileName(path: string): string {
  const normalized = normalizePath(path)
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

export function markdownFilesOnly(paths: string[]): string[] {
  return paths.filter(isMarkdownPath)
}

export function openPathsMeta(paths: string[]): { root: string | null; files: string[] } {
  const files = markdownFilesOnly(paths)
  if (files.length === 0) {
    return { root: null, files: [] }
  }
  return { root: parentDir(files[0]), files }
}

export function markdownPathsFromArgv(argv: string[]): string[] {
  return argv.filter((arg) => !arg.startsWith('-') && isMarkdownPath(arg))
}
