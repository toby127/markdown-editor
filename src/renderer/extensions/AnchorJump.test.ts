/** @vitest-environment happy-dom */
import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMarkdownExtensions } from '../../shared/md-extensions'
import { AnchorJump } from './AnchorJump'

let editor: Editor | null = null

afterEach(() => {
  editor?.destroy()
  editor = null
})

function open(content: string, onWikiLink?: (target: string) => void): Editor {
  editor = new Editor({
    extensions: [...createMarkdownExtensions(), AnchorJump.configure({ onWikiLink })],
    content
  })
  return editor
}

function clickAt(ed: Editor, pos: number, html: string): boolean {
  const holder = document.createElement('div')
  holder.innerHTML = html
  const target = holder.firstElementChild as HTMLElement
  const event = new MouseEvent('click', { bubbles: true })
  Object.defineProperty(event, 'target', { value: target })
  return Boolean(
    ed.view.someProp('handleClick', (fn) => fn(ed.view, pos, event))
  )
}

function findNodePos(ed: Editor, type: string, predicate?: (node: { attrs: Record<string, unknown> }) => boolean): number | null {
  let found: number | null = null
  ed.state.doc.descendants((node, pos) => {
    if (found != null) return false
    if (node.type.name !== type) return true
    if (predicate && !predicate(node)) return true
    found = pos
    return false
  })
  return found
}

describe('AnchorJump', () => {
  it('clicking a TOC link selects the matching heading', () => {
    const ed = open('# Intro\n\n## Details\n\nbody')
    const headingPos = findNodePos(ed, 'heading') ?? -1
    expect(clickAt(ed, 1, '<a href="#intro">Intro</a>')).toBe(true)
    expect(ed.state.selection.from).toBe(headingPos + 1)
  })

  it('clicking a TOC link with no matching heading is ignored', () => {
    const ed = open('# Intro\n\nbody')
    expect(clickAt(ed, 1, '<a href="#missing">Missing</a>')).toBe(false)
  })

  it('clicking a footnote reference jumps to its definition', () => {
    const ed = open('text[^1]\n\n[^1]: note here\n')
    const refPos = findNodePos(ed, 'footnoteRef') ?? -1
    expect(clickAt(ed, refPos, '<span data-footnote-ref="1">[^1]</span>')).toBe(true)
    const selected = ed.state.doc.resolve(ed.state.selection.from).parent
    expect(selected.textContent).toContain('note here')
  })

  it('clicking a footnote definition jumps back to the reference', () => {
    const ed = open('text[^1]\n\n[^1]: note here\n')
    const defs = findNodePos(ed, 'footnoteRef', (n) => n.attrs.label === '1')
    expect(defs).not.toBeNull()
    // Find the second occurrence: the definition's leading atom.
    let second: number | null = null
    let count = 0
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'footnoteRef') return true
      count += 1
      if (count === 2) {
        second = pos
        return false
      }
      return true
    })
    expect(second).not.toBeNull()
    expect(clickAt(ed, second!, '<span data-footnote-ref="1">[^1]</span>')).toBe(true)
    const selected = ed.state.doc.resolve(ed.state.selection.from).parent
    expect(selected.textContent).not.toContain('note here')
  })

  it('clicking a wiki link delegates the target to the app shell', () => {
    const onWikiLink = vi.fn()
    const ed = open('see [[Target|Alias]]', onWikiLink)
    const pos = findNodePos(ed, 'wikiLink') ?? -1
    expect(pos).toBeGreaterThanOrEqual(0)
    expect(
      clickAt(ed, pos, '<span data-wiki-link="Target" data-wiki-alias="Alias">Alias</span>')
    ).toBe(true)
    expect(onWikiLink).toHaveBeenCalledWith('Target')
  })
})
