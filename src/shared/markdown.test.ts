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

  it('roundtrips footnote references and definitions without broken links', () => {
    const input = 'text[^1]\n\n[^1]: note here\n'
    const html = markdownToHtml(input)
    // The reference must stay a footnote atom, not become <a href="note">.
    expect(html).not.toMatch(/href\s*=\s*["']?note/i)
    expect(html).toContain('data-footnote-ref="1"')
    expect(html).toContain('note here')
    // Both the reference and the definition survive byte-for-byte.
    const back = htmlToMarkdown(html)
    expect(normalizeMarkdown(back)).toBe(normalizeMarkdown(input))
  })
})

describe('markdown HTML sanitization', () => {
  it('strips script tags from raw HTML before producing editor HTML', () => {
    const html = markdownToHtml('# ok\n\n<script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).toContain('<h1>ok</h1>')
  })

  it('strips inline event handlers and javascript: URLs from raw HTML', () => {
    const html = markdownToHtml('<p onclick="alert(1)">x</p>\n\n<a href="javascript:alert(1)">y</a>\n')
    expect(html).not.toMatch(/\bon\w+\s*=/i)
    expect(html).not.toMatch(/href\s*=\s*["']?javascript:/i)
  })

  it('keeps task-list checkboxes intact after sanitization', () => {
    const html = markdownToHtml('- [x] done\n')
    expect(html).toContain('checkbox')
    expect(html).toContain('checked')
  })
})
