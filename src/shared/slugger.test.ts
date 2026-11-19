/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { createHeadingSlugger, slugifyHeading } from './slugger'
import { buildExportHtml } from './export-html'
import { createMarkdownExtensions } from './md-extensions'
import { Editor } from '@tiptap/core'

describe('slugifyHeading', () => {
  it('lowercases and strips ASCII/CJK punctuation', () => {
    expect(slugifyHeading('Hello, World!')).toBe('hello-world')
    expect(slugifyHeading('第一章：简介')).toBe('第一章简介')
  })

  it('preserves Chinese characters', () => {
    expect(slugifyHeading('标题 with 中文')).toBe('标题-with-中文')
  })
})

describe('createHeadingSlugger', () => {
  it('adds numeric suffixes for duplicates', () => {
    const slug = createHeadingSlugger()
    expect([slug('A'), slug('A'), slug('A'), slug('B')]).toEqual(['a', 'a-1', 'a-2', 'b'])
  })
})

describe('TOC and exported anchors agree', () => {
  it('uses the same slug sequence for duplicate headings', () => {
    const editor = new Editor({
      extensions: createMarkdownExtensions(),
      content: '# Intro\n\n## Intro\n\n## Details\n'
    })
    const slug = createHeadingSlugger()
    const anchors: string[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') anchors.push(slug(node.textContent))
    })
    editor.destroy()

    const html = buildExportHtml(
      '<h1>Intro</h1><h2>Intro</h2><h2>Details</h2>',
      'Doc'
    )
    expect(anchors).toEqual(['intro', 'intro-1', 'details'])
    for (const anchor of anchors) {
      expect(html).toContain(`id="${anchor}"`)
    }
  })
})
