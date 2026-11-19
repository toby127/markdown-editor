/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Editor from './Editor'

/**
 * UI smoke tests for first-tier features: verify the real renderer (not just
 * the headless converter) actually produces highlighted code and editable
 * tables in the live ProseMirror DOM.
 */
describe('Editor first-tier features (UI smoke)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // @ts-expect-error vitest global
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function render(content: string) {
    await act(async () => {
      root.render(<Editor content={content} onChangeMarkdown={() => {}} />)
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  it('renders a fenced code block with lowlight highlight spans', async () => {
    await render('```js\nconst x = 1\n```\n')
    const code = container.querySelector('pre code')
    expect(code).not.toBeNull()
    expect(code?.querySelector('span[class*="hljs-"]')).not.toBeNull()
  })

  it('renders a GFM table as editable table DOM', async () => {
    await render('| A | B |\n| --- | --- |\n| 1 | 2 |\n')
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelectorAll('th').length).toBe(2)
    expect(container.querySelectorAll('td').length).toBe(2)
  })

  it('renders an image node', async () => {
    await render('![alt](https://example.com/a.png)\n')
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://example.com/a.png')
  })

  it('renders ==highlight== as a mark element', async () => {
    await render('a ==highlighted== word\n')
    expect(container.querySelector('mark')?.textContent).toBe('highlighted')
  })

  it('renders ^sup^ and ~sub^ as sup/sub elements', async () => {
    await render('x^2^ and H~2~O\n')
    expect(container.querySelector('sup')?.textContent).toBe('2')
    expect(container.querySelector('sub')?.textContent).toBe('2')
  })

  it('linkifies bare URLs', async () => {
    await render('see https://example.com now\n')
    const a = [...container.querySelectorAll('a')].find(
      (el) => el.getAttribute('href') === 'https://example.com'
    )
    expect(a).not.toBeUndefined()
  })

  it('keeps footnote reference as literal text (not a broken link)', async () => {
    await render('text[^1]\n\n[^1]: note here\n')
    expect(container.textContent).toContain('note here')
    expect(container.textContent).toContain('[^1]')
    expect(container.querySelector('a[href="note"]')).toBeNull()
  })
})
