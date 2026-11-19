/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { sanitizeHtmlString, sanitizeRenderedDom } from './sanitize'

describe('sanitizeHtmlString', () => {
  it('removes script elements', () => {
    expect(sanitizeHtmlString('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })

  it('removes inline event handlers but keeps the element', () => {
    const out = sanitizeHtmlString('<p onclick="alert(1)" class="x">text</p>')
    expect(out).toBe('<p class="x">text</p>')
  })

  it('removes javascript:/vbscript: URLs', () => {
    expect(sanitizeHtmlString('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(sanitizeHtmlString('<a href="vbscript:msgbox(1)">x</a>')).not.toContain('vbscript:')
  })

  it('keeps safe http/https/mailto/relative URLs', () => {
    const out = sanitizeHtmlString(
      '<a href="https://a.com">1</a><a href="/rel">2</a><a href="#x">3</a><a href="mailto:a@b.c">4</a>'
    )
    expect(out).toContain('href="https://a.com"')
    expect(out).toContain('href="/rel"')
    expect(out).toContain('href="#x"')
    expect(out).toContain('href="mailto:a@b.c"')
  })

  it('removes dangerous tags (iframe/object/style/meta)', () => {
    const out = sanitizeHtmlString(
      '<style>x{}</style><iframe src="x"></iframe><meta http-equiv="refresh"><p>safe</p>'
    )
    expect(out).not.toMatch(/<style|<iframe|<meta/i)
    expect(out).toContain('<p>safe</p>')
  })

  it('keeps table structure', () => {
    const out = sanitizeHtmlString('<table><tr><th>A</th><td>B</td></tr></table>')
    expect(out).toContain('<table>')
    expect(out).toContain('<th>A</th>')
  })

  it('keeps task-list checkbox and checked state', () => {
    const out = sanitizeHtmlString(
      '<ul><li class="task-list-item"><input type="checkbox" checked>done</li></ul>'
    )
    expect(out).toContain('type="checkbox"')
    expect(out).toMatch(/\bchecked\b/)
  })

  it('keeps data-* attributes', () => {
    const out = sanitizeHtmlString('<ul data-type="taskList"><li data-checked="true">x</li></ul>')
    expect(out).toContain('data-type="taskList"')
    expect(out).toContain('data-checked="true"')
  })

  it('handles script with attributes and multiline payload', () => {
    const out = sanitizeHtmlString('<script type="text/javascript">\nalert(1)\n</script><p>ok</p>')
    expect(out).not.toContain('<script')
    expect(out).toBe('<p>ok</p>')
  })
})

describe('sanitizeRenderedDom (in-place)', () => {
  it('cleans a live element without replacing it', () => {
    const body = document.createElement('body')
    body.innerHTML = '<p onclick="x()">ok</p><script>bad()</script>'
    const result = sanitizeRenderedDom(body)
    expect(result).toBe(body)
    expect(body.querySelector('script')).toBeNull()
    expect(body.querySelector('p')?.hasAttribute('onclick')).toBe(false)
  })
})
