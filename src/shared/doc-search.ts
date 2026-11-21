// Pure document-internal search logic. Kept free of ProseMirror so it can be
// unit-tested directly; the editor extension maps the resulting ranges onto
// document positions.

export type SearchOptions = {
  caseSensitive?: boolean
  wholeWord?: boolean
}

export type TextSegment = {
  /** Text of one ProseMirror text node. */
  text: string
  /** Document position where this segment starts. */
  pos: number
}

export type DocMatch = {
  from: number
  to: number
  text: string
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a case-insensitive-by-default, literal (non-regex) matcher.
 * `wholeWord` uses Unicode letter/number boundaries so it also behaves
 * sensibly for CJK runs, where `\b` would never match.
 */
export function buildSearchRegExp(query: string, options: SearchOptions = {}): RegExp | null {
  if (query.length === 0) return null
  const escaped = escapeRegExp(query)
  const pattern = options.wholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped
  const flags = options.caseSensitive ? 'gu' : 'giu'
  try {
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
}

/**
 * Find all matches of `query` across text segments. Segments are concatenated
 * conceptually, so a match may span two adjacent text nodes (e.g. across a
 * formatting boundary). Returned positions are mapped back to document space.
 */
export function findInSegments(
  segments: TextSegment[],
  query: string,
  options: SearchOptions = {}
): DocMatch[] {
  const re = buildSearchRegExp(query, options)
  if (!re) return []

  // Flat map from concatenated-string index to document position.
  const positions: number[] = []
  let source = ''
  for (const seg of segments) {
    if (seg.text.length === 0) continue
    source += seg.text
    for (let i = 0; i < seg.text.length; i += 1) {
      positions.push(seg.pos + i)
    }
  }

  const matches: DocMatch[] = []
  for (const m of source.matchAll(re)) {
    const start = m.index ?? 0
    const end = start + m[0].length
    const from = positions[start]
    const last = positions[end - 1]
    if (from == null || last == null) continue
    matches.push({ from, to: last + 1, text: m[0] })
  }
  return matches
}

/** Clamp an index into a match list, wrapping around for navigation. */
export function clampMatchIndex(index: number, count: number): number {
  if (count <= 0) return -1
  return ((index % count) + count) % count
}
