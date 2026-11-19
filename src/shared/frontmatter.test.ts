import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './frontmatter'

describe('parseFrontMatter', () => {
  it('parses title and inline tags', () => {
    const fm = parseFrontMatter('---\ntitle: "Hello"\ntags: [go, "web, api"]\n---\n\nbody\n')
    expect(fm).not.toBeNull()
    expect(fm?.title).toBe('Hello')
    expect(fm?.tags).toEqual(['go', 'web, api'])
  })

  it('parses block-style tags', () => {
    const fm = parseFrontMatter('---\ntags:\n  - alpha\n  - beta\n---\n')
    expect(fm?.tags).toEqual(['alpha', 'beta'])
  })

  it('returns null when there is no front matter', () => {
    expect(parseFrontMatter('# Title\n\ntags: [x]\n')).toBeNull()
  })

  it('returns null for an unterminated block', () => {
    expect(parseFrontMatter('---\ntitle: x\n')).toBeNull()
  })

  it('ignores unrelated YAML keys', () => {
    const fm = parseFrontMatter('---\ndate: 2026-01-01\nstatus: draft\n---\n')
    expect(fm?.title).toBeNull()
    expect(fm?.tags).toEqual([])
  })
})
