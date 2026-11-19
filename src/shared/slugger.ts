/**
 * Heading slug generation, shared by TOC insertion and HTML export so the
 * two cannot drift apart.
 *
 * The single-heading form mirrors markdown-it-anchor's default `slugify`:
 * lowercase, trim, strip CJK/ASCII punctuation ranges, spaces to hyphens.
 * Unicode letters (including Chinese) are preserved, which matters for this
 * project's mostly-Chinese documents.
 *
 * The factory form adds GitHub-style `-1`, `-2` suffixes for duplicate
 * headings. Both consumers must walk the document in order with the SAME
 * slugger instance, otherwise the suffixes will not line up.
 */

// CJK punctuation lives in \u3000-\u303F (inside the CJK-symbols block) and
// fullwidth ASCII punctuation in \uFF01-\uFF65. Chinese headings use the
// fullwidth colon/comma constantly, so both ranges must be covered.
const PUNCTUATION = /[\u2000-\u206F\u2E00-\u2E7F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(PUNCTUATION, '')
    .replace(/\s/g, '-')
}

export type HeadingSlugger = (text: string) => string

export function createHeadingSlugger(): HeadingSlugger {
  const seen = new Map<string, number>()
  return (text: string): string => {
    const base = slugifyHeading(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}
