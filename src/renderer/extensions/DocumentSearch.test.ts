/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { createMarkdownExtensions } from '../../shared/md-extensions'
import {
  DocumentSearch,
  focusCurrentMatch,
  readDocumentSearch
} from './DocumentSearch'

function open(markdown: string): Editor {
  return new Editor({ extensions: [...createMarkdownExtensions(), DocumentSearch], content: markdown })
}

describe('DocumentSearch probe', () => {
  it('finds case-insensitive matches and tracks current index', () => {
    const editor = open('Hello hello world HELLO\n')
    editor.commands.setSearchQuery('hello')
    const s = readDocumentSearch(editor)
    expect(s.matches).toHaveLength(3)
    expect(s.currentIndex).toBe(0)
    editor.commands.nextMatch()
    expect(readDocumentSearch(editor).currentIndex).toBe(1)
    editor.commands.previousMatch()
    expect(readDocumentSearch(editor).currentIndex).toBe(0)
    editor.destroy()
  })

  it('caseSensitive and wholeWord narrow matches', () => {
    const editor = open('cat category Cat scat cat\n')
    editor.commands.setSearchQuery('cat', { caseSensitive: true, wholeWord: true })
    expect(readDocumentSearch(editor).matches).toHaveLength(2) // first 'cat' and last 'cat'
    editor.commands.setSearchQuery('cat', { caseSensitive: false, wholeWord: false })
    expect(readDocumentSearch(editor).matches).toHaveLength(5)
    editor.destroy()
  })

  it('highlighting does not change markdown; replaceCurrent does', () => {
    const editor = open('one two one\n')
    const before = editor.storage.markdown.getMarkdown() as string
    editor.commands.setSearchQuery('one')
    expect(editor.storage.markdown.getMarkdown()).toBe(before) // decoration only
    editor.commands.replaceCurrent('ONE')
    const after = editor.storage.markdown.getMarkdown() as string
    expect(after).toContain('ONE two one')
    editor.destroy()
  })

  it('replaceAll replaces every match', () => {
    const editor = open('a a a\n')
    editor.commands.setSearchQuery('a')
    expect(editor.commands.replaceAll('b')).toBe(3)
    expect(editor.storage.markdown.getMarkdown().trim()).toBe('b b b')
    editor.destroy()
  })

  it('focusCurrentMatch moves selection onto the active match', () => {
    const editor = open('foo bar foo\n')
    editor.commands.setSearchQuery('foo')
    editor.commands.nextMatch()
    focusCurrentMatch(editor)
    const { from, to } = editor.state.selection
    expect(editor.state.doc.textBetween(from, to)).toBe('foo')
    editor.destroy()
  })

  it('empty query yields no matches; clear resets', () => {
    const editor = open('abc abc\n')
    editor.commands.setSearchQuery('abc')
    expect(readDocumentSearch(editor).matches).toHaveLength(2)
    editor.commands.clearSearch()
    expect(readDocumentSearch(editor).matches).toHaveLength(0)
    expect(readDocumentSearch(editor).query).toBe('')
    editor.destroy()
  })
})
