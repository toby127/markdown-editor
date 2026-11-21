import { describe, expect, it } from 'vitest'
import {
  buildSearchRegExp,
  clampMatchIndex,
  findInSegments,
  type TextSegment
} from './doc-search'

const seg = (text: string, pos = 0): TextSegment[] => [{ text, pos }]

describe('doc-search pure logic', () => {
  it('returns null regex for empty query', () => {
    expect(buildSearchRegExp('')).toBeNull()
  })

  it('treats query as literal, not regex', () => {
    const re = buildSearchRegExp('a.b')
    expect('a.b'.match(re!)).toBeTruthy()
    expect('axb'.match(re!)).toBeNull()
  })

  it('case-insensitive by default, caseSensitive narrows', () => {
    const segments = seg('Hello hello HELLO')
    expect(findInSegments(segments, 'hello')).toHaveLength(3)
    expect(findInSegments(segments, 'hello', { caseSensitive: true })).toHaveLength(1)
  })

  it('wholeWord uses unicode boundaries', () => {
    const segments = seg('cat category Cat 猫cat')
    const all = findInSegments(segments, 'cat')
    const words = findInSegments(segments, 'cat', { wholeWord: true })
    expect(all.length).toBeGreaterThan(words.length)
    // standalone "cat" and "Cat" (case-insensitive) both count; substrings do not
    expect(words).toHaveLength(2)
  })

  it('maps matches back to document positions across segments', () => {
    const segments: TextSegment[] = [
      { text: 'foo ', pos: 1 },
      { text: 'barfoo', pos: 20 }
    ]
    const matches = findInSegments(segments, 'foo')
    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({ from: 1, to: 4, text: 'foo' })
    expect(matches[1]).toMatchObject({ from: 23, to: 26, text: 'foo' })
  })

  it('finds matches spanning adjacent text nodes', () => {
    const segments: TextSegment[] = [
      { text: 'hel', pos: 0 },
      { text: 'lo world', pos: 3 }
    ]
    const matches = findInSegments(segments, 'hello')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ from: 0, to: 5 })
  })

  it('clampMatchIndex wraps both directions', () => {
    expect(clampMatchIndex(3, 3)).toBe(0)
    expect(clampMatchIndex(-1, 3)).toBe(2)
    expect(clampMatchIndex(0, 0)).toBe(-1)
  })
})
