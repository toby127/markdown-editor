import { Extension } from '@tiptap/core'
import { Plugin, TextSelection, type EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { createHeadingSlugger } from '../../shared/slugger'

/**
 * In-editor navigation for TOC links and footnote references.
 *
 * The editor deliberately disables Link.openOnClick, so clicking a
 * `#slug` link would otherwise do nothing. Same for `[^label]` atoms.
 * Everything here is a view decoration concern — no document mutation,
 * so Markdown serialization is unaffected.
 */

function scrollTo(view: EditorView, pos: number): void {
  const dom = view.domAtPos(pos)
  const node = dom.node
  const element =
    node.nodeType === 3
      ? (node.parentElement as HTMLElement | null)
      : (node as HTMLElement | null)
  element?.scrollIntoView?.({ block: 'center' })
  if (pos >= 0 && pos <= view.state.doc.content.size) {
    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(view.state.doc, pos))
        .scrollIntoView()
    )
  }
}

function findHeading(state: EditorState, wanted: string): number | null {
  const slug = createHeadingSlugger()
  let target: number | null = null
  state.doc.descendants((node, pos) => {
    if (target != null) return false
    if (node.type.name !== 'heading') return true
    if (slug(node.textContent) === wanted) {
      target = pos + 1
      return false
    }
    return true
  })
  return target
}

/**
 * Locate a footnote definition paragraph: its first child is the `[^label]`
 * atom, followed by `: note` text.
 */
function isDefinitionParagraph(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos)
  const parent = $pos.parent
  const first = parent.firstChild
  return first?.type.name === 'footnoteRef' && $pos.parentOffset <= first.nodeSize
}

function findFootnoteDefinition(state: EditorState, label: string): number | null {
  let target: number | null = null
  state.doc.descendants((node, pos) => {
    if (target != null) return false
    if (node.type.name !== 'paragraph') return true
    const first = node.firstChild
    if (first?.type.name === 'footnoteRef' && first.attrs.label === label) {
      target = pos + 1
      return false
    }
    return true
  })
  return target
}

/** Find the first body reference to a label, skipping definition paragraphs. */
function findFootnoteUse(state: EditorState, label: string, excludePos: number): number | null {
  let target: number | null = null
  state.doc.descendants((node, pos) => {
    if (target != null) return false
    if (node.type.name !== 'footnoteRef' || node.attrs.label !== label) return true
    if (isDefinitionParagraph(state, pos)) return true
    // Skip the atom the user just clicked.
    if (Math.abs(pos - excludePos) <= 1) return true
    target = pos + 1
    return false
  })
  return target
}

export type AnchorJumpOptions = {
  /** Opening a `[[wiki link]]` is delegated to the app shell. */
  onWikiLink?: (target: string) => void
}

export const AnchorJump = Extension.create<AnchorJumpOptions>({
  name: 'anchorJump',

  addOptions() {
    return { onWikiLink: undefined }
  },

  addProseMirrorPlugins() {
    const { onWikiLink } = this.options
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement | null
            if (!target) return false

            const anchor = target.closest?.('a[href^="#"]') as HTMLAnchorElement | null
            if (anchor) {
              let wanted = anchor.getAttribute('href')?.slice(1) ?? ''
              try {
                wanted = decodeURIComponent(wanted)
              } catch {
                // malformed escape: treat as literal slug
              }
              const headingPos = findHeading(view.state, wanted)
              if (headingPos == null) return false
              scrollTo(view, headingPos)
              return true
            }

            const wiki = target.closest?.('span[data-wiki-link]') as HTMLElement | null
            if (wiki) {
              const linkTarget = wiki.getAttribute('data-wiki-link') ?? ''
              if (linkTarget === '') return false
              onWikiLink?.(linkTarget)
              return true
            }

            const ref = target.closest?.('span[data-footnote-ref]') as HTMLElement | null
            if (!ref) return false
            const label = ref.getAttribute('data-footnote-ref') ?? ''
            if (label === '') return false

            const destination = isDefinitionParagraph(view.state, pos)
              ? findFootnoteUse(view.state, label, pos)
              : findFootnoteDefinition(view.state, label)
            if (destination == null) return false
            scrollTo(view, destination)
            return true
          }
        }
      })
    ]
  }
})
