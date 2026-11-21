/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { buildExportHtml } from './export-html'

describe('buildExportHtml', () => {
  it('builds a standalone document with embedded styles', () => {
    const out = buildExportHtml('<h1>Title</h1><p>text</p>', 'Doc')
    expect(out).toContain('<!DOCTYPE html>')
    expect(out).toContain('<style>')
    expect(out).toContain('<h1 id="title">Title</h1>')
    expect(out).toContain('<title>Doc</title>')
  })

  it('gives duplicate headings stable -1/-2 ids', () => {
    const out = buildExportHtml(
      '<h1>Intro</h1><h2>Intro</h2><h2>Intro</h2>',
      'Doc'
    )
    expect(out).toContain('<h1 id="intro">Intro</h1>')
    expect(out).toContain('<h2 id="intro-1">Intro</h2>')
    expect(out).toContain('<h2 id="intro-2">Intro</h2>')
  })

  it('keeps Chinese characters in heading ids', () => {
    const out = buildExportHtml('<h1>第一章 简介</h1>', 'Doc')
    expect(out).toContain('<h1 id="第一章-简介">第一章 简介</h1>')
  })

  it('highlights fenced code blocks with hljs tokens', () => {
    const out = buildExportHtml('<pre><code class="language-js">const x = 1</code></pre>', 'Doc')
    expect(out).toContain('hljs-keyword')
  })

  it('escapes the title to prevent injection', () => {
    const out = buildExportHtml('<p>x</p>', '</title><script>x</script>')
    expect(out).not.toContain('<script>x</script>')
    expect(out).toContain('&lt;/title&gt;')
  })

  it('sanitizes dangerous HTML in the body', () => {
    const out = buildExportHtml('<p onclick="x()">ok</p><script>bad()</script>', 'Doc')
    expect(out).not.toContain('<script')
    expect(out).not.toMatch(/onclick/i)
  })

  it('defaults to light theme CSS', () => {
    const out = buildExportHtml('<p>x</p>', 'Doc')
    expect(out).toContain('color-scheme: light')
    expect(out).not.toContain('color-scheme: dark')
  })

  it('embeds dark theme CSS when requested', () => {
    const out = buildExportHtml('<p>x</p>', 'Doc', 'dark')
    expect(out).toContain('color-scheme: dark')
    expect(out).toContain('#1e1e1e')
  })
})
