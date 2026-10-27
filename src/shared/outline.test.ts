import { describe, expect, it } from 'vitest'
import { extractOutline } from './outline'

describe('extractOutline', () => {
  it('returns empty for blank or heading-free markdown', () => {
    expect(extractOutline('')).toEqual([])
    expect(extractOutline('hello\n\nworld')).toEqual([])
  })

  it('extracts ATX headings in order with levels and stable index', () => {
    const md = `# A\n\n## B\ntext\n### C\n###### Z\n`
    expect(extractOutline(md)).toEqual([
      { level: 1, text: 'A', index: 0 },
      { level: 2, text: 'B', index: 1 },
      { level: 3, text: 'C', index: 2 },
      { level: 6, text: 'Z', index: 3 }
    ])
  })

  it('trims heading text and ignores # without space', () => {
    expect(extractOutline('#  Title  \n#NotHeading\n')).toEqual([
      { level: 1, text: 'Title', index: 0 }
    ])
  })

  it('normalizes CRLF', () => {
    expect(extractOutline('# A\r\n## B\r\n')).toEqual([
      { level: 1, text: 'A', index: 0 },
      { level: 2, text: 'B', index: 1 }
    ])
  })
})
