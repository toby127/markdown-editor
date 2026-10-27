/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, markdownToHtml, normalizeMarkdown } from './markdown'

describe('markdown roundtrip', () => {
  it('roundtrips headings, lists, emphasis, link, code', () => {
    const input = [
      '# Title',
      '',
      'Hello **bold** and *italic*.',
      '',
      '- item one',
      '- item two',
      '',
      '> quote',
      '',
      'A [link](https://example.com) and `code`.',
      '',
      '```',
      'const x = 1',
      '```',
      ''
    ].join('\n')

    const html = markdownToHtml(input)
    const back = htmlToMarkdown(html)
    expect(normalizeMarkdown(back)).toBe(normalizeMarkdown(input))
  })

  it('does not throw on unsupported-looking syntax', () => {
    expect(() => markdownToHtml('$$not-math$$')).not.toThrow()
  })
})
