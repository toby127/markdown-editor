/**
 * Minimal YAML Front Matter reader for the workspace tag index.
 *
 * Deliberately not a full YAML parser: the editor's FrontMatter node stores
 * the body verbatim, and the index only needs `title` plus the common `tags`
 * spellings (inline `[a, b]` or a `- item` list). Unsupported shapes are
 * ignored rather than misparsed.
 */

export type FrontMatterData = {
  title: string | null
  tags: string[]
  raw: string
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

/** Split a tag list on commas, but not on commas inside quoted tags. */
function splitInlineTags(value: string): string[] {
  const out: string[] = []
  let current = ''
  let quote: string | null = null
  for (const ch of value) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === ',') {
      if (current.trim()) out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) out.push(current.trim())
  return out
}

function parseTags(lines: string[]): string[] {
  const inline = lines.find((line) => /^tags\s*:/.test(line))
  if (!inline) return []

  const value = inline.replace(/^tags\s*:\s*/, '').trim()
  if (value.startsWith('[') && value.endsWith(']')) {
    return splitInlineTags(value.slice(1, -1)).filter(Boolean)
  }
  if (value !== '') return [unquote(value)]

  // Block form:
  // tags:
  //   - alpha
  //   - beta
  const start = lines.indexOf(inline)
  const tags: string[] = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^\S/.test(line)) break
    const match = /^\s+-\s+(.+?)\s*$/.exec(line)
    if (match) tags.push(unquote(match[1]))
  }
  return tags
}

/** Parse front matter at the very start of a Markdown document. */
export function parseFrontMatter(markdown: string): FrontMatterData | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== '---') return null

  let close = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      close = i
      break
    }
  }
  if (close < 0) return null

  const body = lines.slice(1, close)
  const titleLine = body.find((line) => /^title\s*:/.test(line))
  const title = titleLine
    ? unquote(titleLine.replace(/^title\s*:\s*/, ''))
    : null

  return { title, tags: parseTags(body), raw: body.join('\n') }
}
