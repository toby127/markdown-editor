import { describe, expect, it } from 'vitest'
import { collectText, countWords, EMPTY_STATS } from './word-count'

describe('countWords', () => {
  it('returns empty stats for empty input', () => {
    expect(countWords('')).toEqual(EMPTY_STATS)
    expect(countWords('   \n  ')).toEqual(EMPTY_STATS)
  })

  it('counts CJK characters individually as words', () => {
    const s = countWords('你好世界')
    expect(s.words).toBe(4)
    expect(s.characters).toBe(4)
    expect(s.lines).toBe(1)
    expect(s.readingMinutes).toBe(1)
  })

  it('counts latin runs as one word each', () => {
    const s = countWords('hello world foo')
    expect(s.words).toBe(3)
    expect(s.characters).toBe(13) // 5+5+3, excludes the 2 spaces
  })

  it('counts mixed CJK and latin correctly', () => {
    // 你好(2 CJK) + hello(1) + 世界(2 CJK)
    const s = countWords('你好hello世界')
    expect(s.words).toBe(5)
    expect(s.characters).toBe(9)
  })

  it('does not count punctuation as words but counts them as characters', () => {
    const s = countWords('你好，世界。')
    expect(s.words).toBe(4)
    expect(s.characters).toBe(6) // 4 CJK + 2 punctuation
  })

  it('counts only non-empty lines', () => {
    const s = countWords('第一行\n\n第二行\n  \n第三行')
    expect(s.lines).toBe(3)
  })

  it('estimates reading time with a one-minute floor for non-empty docs', () => {
    expect(countWords('a').readingMinutes).toBe(1)
    expect(countWords('word '.repeat(440)).readingMinutes).toBe(2)
  })

  it('handles a long CJK document', () => {
    const s = countWords('中'.repeat(800))
    expect(s.words).toBe(800)
    expect(s.readingMinutes).toBe(2) // 800/400
  })
})

describe('collectText', () => {
  const block = (text: string) => ({
    type: { name: 'paragraph' },
    descendants: (cb: (n: { isText: boolean; text: string; type: { name: string } }) => void) => {
      cb({ isText: true, text, type: { name: 'text' } })
    }
  })

  it('joins top-level blocks with newlines', () => {
    const doc = { content: { content: [block('第一段'), block('第二段')] } }
    expect(collectText(doc)).toBe('第一段\n第二段')
  })

  it('handles hard breaks inside a block', () => {
    const node = {
      type: { name: 'paragraph' },
      descendants: (cb: (n: { isText?: boolean; text?: string; type: { name: string } }) => void) => {
        cb({ isText: true, text: 'a', type: { name: 'text' } })
        cb({ type: { name: 'hardBreak' } })
        cb({ isText: true, text: 'b', type: { name: 'text' } })
      }
    }
    expect(collectText({ content: { content: [node] } })).toBe('a\nb')
  })
})
