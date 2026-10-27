import { describe, expect, it } from 'vitest'
import { isMarkdownPath, parentDir, fileName, markdownFilesOnly, openPathsMeta, markdownPathsFromArgv, normalizePath } from './paths'

describe('isMarkdownPath', () => {
  it('accepts md and markdown case-insensitive', () => {
    expect(isMarkdownPath('a/b/C.MD')).toBe(true)
    expect(isMarkdownPath('x.markdown')).toBe(true)
    expect(isMarkdownPath('x.txt')).toBe(false)
  })
})

describe('parentDir/fileName', () => {
  it('splits paths with backslash or slash', () => {
    expect(parentDir('C:\\ws\\a.md')).toBe('C:\\ws')
    expect(fileName('C:\\ws\\a.md')).toBe('a.md')
    expect(parentDir('/ws/a.md')).toBe('/ws')
  })
})

describe('markdownFilesOnly', () => {
  it('keeps only md and markdown paths', () => {
    expect(
      markdownFilesOnly(['/a/x.txt', '/a/b.MD', '/a/c.markdown', '/a/d.md.bak'])
    ).toEqual(['/a/b.MD', '/a/c.markdown'])
  })
})

describe('openPathsMeta', () => {
  it('openPathsStrategy sets root from first file', () => {
    expect(openPathsMeta(['/other/x.txt', '/ws/a.md', '/ws/sub/b.md'])).toEqual({
      root: '/ws',
      files: ['/ws/a.md', '/ws/sub/b.md']
    })
  })

  it('returns empty when no markdown paths', () => {
    expect(openPathsMeta(['/a/x.txt', '/a/y.doc'])).toEqual({
      root: null,
      files: []
    })
  })
})

describe('markdownPathsFromArgv', () => {
  it('filters argv to markdown file paths only', () => {
    expect(
      markdownPathsFromArgv([
        'C:\\App\\markdown-editor.exe',
        '--some-flag',
        'C:\\docs\\note.md',
        'C:\\docs\\skip.txt',
        'D:\\readme.markdown'
      ])
    ).toEqual(['C:\\docs\\note.md', 'D:\\readme.markdown'])
  })
})

describe('normalizePath', () => {
  it('normalizes backslashes to forward slashes', () => {
    expect(normalizePath('C:\\ws\\a.md')).toBe('C:/ws/a.md')
    expect(normalizePath('C:/ws/a.md')).toBe('C:/ws/a.md')
  })

  it('treats mixed separators as the same path identity', () => {
    expect(normalizePath('C:\\ws\\a.md')).toBe(normalizePath('C:/ws/a.md'))
  })

  it('does not case-fold the whole path', () => {
    expect(normalizePath('/Ws/A.md')).toBe('/Ws/A.md')
    expect(normalizePath('/Ws/A.md')).not.toBe(normalizePath('/ws/a.md'))
  })
})
