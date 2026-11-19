import { describe, expect, it } from 'vitest'
import {
  extractWikiLinks,
  normalizeWikiTarget,
  parseWikiLink,
  resolveWikiTarget,
  wikiTargetForFile
} from './wiki-link'

describe('wiki link parsing', () => {
  it('parses targets and aliases', () => {
    expect(parseWikiLink('Target')).toEqual({ target: 'Target', alias: null })
    expect(parseWikiLink('Target | Alias ')).toEqual({ target: 'Target', alias: 'Alias' })
    expect(parseWikiLink('   ')).toBeNull()
  })

  it('normalizes paths, extensions and case', () => {
    expect(normalizeWikiTarget('./Sub/Note.MD')).toBe('sub/note')
    expect(normalizeWikiTarget('sub\\note.markdown')).toBe('sub/note')
  })

  it('extracts unique targets but ignores code', () => {
    const md = [
      'see [[Alpha]] and [[Alpha]]',
      '',
      '`[[InlineCode]]`',
      '',
      '```md',
      '[[Fenced]]',
      '```',
      '',
      '[[Beta|friendly name]]'
    ].join('\n')
    expect(extractWikiLinks(md)).toEqual(['Alpha', 'Beta'])
  })

  it('resolves exact basename before suffix matches', () => {
    const files = [
      { path: '/ws/other/note.md', name: 'note.md' },
      { path: '/ws/sub/note.md', name: 'note.md' }
    ]
    expect(resolveWikiTarget('sub/note', files)).toBe('/ws/sub/note.md')
    expect(resolveWikiTarget('note.md', files)).toBe('/ws/other/note.md')
    expect(resolveWikiTarget('missing', files)).toBeNull()
  })

  it('derives a file target from its basename', () => {
    expect(wikiTargetForFile('/ws/sub/Note.md')).toBe('note')
  })
})
