/**
 * Word/character statistics for the status bar.
 *
 * Pure functions over plain text — the renderer collects text from the
 * ProseMirror doc and passes it here, so this module has no editor dependency
 * and can be tested in isolation. Counting mirrors Typora's status bar:
 * - CJK characters count as one "word" each (no spaces between words)
 * - runs of Latin letters/digits count as one word
 * - reading time assumes ~400 CJK chars (or ~220 Latin words) per minute
 */

export type WordStats = {
  /** Words: CJK chars counted individually, Latin/digit runs counted per run. */
  words: number
  /** All non-whitespace characters. */
  characters: number
  /** Non-empty line count. */
  lines: number
  /** Estimated reading minutes, at least 1 for non-empty docs. */
  readingMinutes: number
}

const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/
/** Latin letters, digits, and connector punctuation that keeps a word together. */
const WORD_CHARS = /[A-Za-z0-9\u00C0-\u024F_]/

export const EMPTY_STATS: WordStats = { words: 0, characters: 0, lines: 0, readingMinutes: 0 }

export function countWords(text: string): WordStats {
  if (!text) return { ...EMPTY_STATS }

  let words = 0
  let characters = 0
  let inLatinRun = false

  for (const ch of text) {
    if (/\s/.test(ch)) {
      inLatinRun = false
      continue
    }
    characters += 1
    if (CJK.test(ch)) {
      // Each CJK char is its own word; break any latin run around it.
      inLatinRun = false
      words += 1
    } else if (WORD_CHARS.test(ch)) {
      if (!inLatinRun) {
        words += 1
        inLatinRun = true
      }
    } else {
      // Punctuation/symbol — not a word, and breaks a latin run.
      inLatinRun = false
    }
  }

  const lines = text.split('\n').filter((line) => line.trim() !== '').length
  // Weight CJK more heavily: 400 chars/min CJK, ~220 words/min Latin.
  const cjkCount = Array.from(text).filter((ch) => CJK.test(ch)).length
  const latinWords = words - cjkCount
  const minutes = cjkCount / 400 + latinWords / 220
  const readingMinutes = minutes > 0 ? Math.max(1, Math.ceil(minutes)) : 0

  return { words, characters, lines, readingMinutes }
}

type TextNodeLike = {
  isText?: boolean
  text?: string | null
  type: { name: string }
  descendants?: (cb: (node: TextNodeLike, pos: number) => boolean | void) => void
}
type DocLike = {
  content?: { content?: TextNodeLike[] }
  descendants?: (cb: (node: TextNodeLike, pos: number) => boolean | void) => void
}

/** Collect plain text from a PM doc, joining top-level blocks with newlines so
 * line counts reflect the visible structure. Inline hard breaks become '\n'. */
export function collectText(doc: DocLike): string {
  const topLevel: TextNodeLike[] = doc.content?.content ?? []
  const blocks: string[] = []

  const collectBlock = (node: TextNodeLike): string => {
    let out = ''
    node.descendants?.((child) => {
      if (child.isText && child.text) out += child.text
      if (child.type.name === 'hardBreak') out += '\n'
      return true
    })
    if (!out && 'text' in node && node.text) out = node.text
    return out
  }

  if (topLevel.length) {
    for (const node of topLevel) blocks.push(collectBlock(node))
  } else if (doc.descendants) {
    // Fallback for docs without a content array.
    let out = ''
    doc.descendants((node) => {
      if (node.isText && node.text) out += node.text
      return true
    })
    blocks.push(out)
  }

  return blocks.join('\n')
}
