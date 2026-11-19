/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, markdownToHtml, normalizeMarkdown } from './markdown'
import { ROUNDTRIP_FIXTURES } from './markdown.fixtures'

describe('markdown roundtrip golden fixtures', () => {
  for (const fixture of ROUNDTRIP_FIXTURES) {
    it(`roundtrips: ${fixture.name}`, () => {
      const html = markdownToHtml(fixture.markdown)
      const back = htmlToMarkdown(html)
      expect(normalizeMarkdown(back)).toBe(normalizeMarkdown(fixture.markdown))
    })
  }

  // Known normalization: taskList is serialized as a loose list (blank lines
  // between items), so byte-equality does not hold. Assert semantics instead —
  // every item and its checked state must survive the roundtrip.
  it('roundtrips task list semantics (items + checked state)', () => {
    const input = '- [ ] todo\n- [x] done\n'
    const back = htmlToMarkdown(markdownToHtml(input))
    expect(back.match(/\[ \]|\[x\]/g)).toEqual(['[ ]', '[x]'])
    expect(back).toContain('todo')
    expect(back).toContain('done')
  })
})

describe('syntax highlighting', () => {
  it('keeps fenced code blocks lossless (highlighting is a view decoration)', () => {
    // lowlight highlighting is a ProseMirror Decoration: visible in the live
    // editor DOM but not part of the document, so it must not affect the md
    // roundtrip. Verify the roundtrip stays exact.
    const input = '```js\nconst x = 1\n```\n'
    const back = htmlToMarkdown(markdownToHtml(input))
    expect(normalizeMarkdown(back)).toBe(normalizeMarkdown(input))
  })
})
