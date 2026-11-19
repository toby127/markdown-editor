import { Extension } from '@tiptap/core'

/**
 * Guards GFM footnotes from being mangled by markdown-it's link-reference
 * parsing.
 *
 * The problem: with `html: true`, markdown-it treats `[^1]: note` as a *link
 * reference definition*, so a reference `[^1]` in the body becomes a broken
 * link `<a href="note">^1</a>` and the definition line disappears. That is
 * content destruction — exactly what the roundtrip promise forbids.
 *
 * Proper GFM footnote support would need custom ProseMirror nodes plus
 * cross-block id management (the reference in the body and the definition at
 * the document end). Registering markdown-it-footnote alone makes things
 * worse: it emits an <hr> + <section class=footnotes> block that TipTap's
 * schema flattens into a stray ordered list, and serialization breaks.
 *
 * This guard takes the safe, honest middle path: escape the colon in footnote
 * definition lines before markdown-it sees them, so `[^1]: note` stays literal
 * text and `[^1]` stays a literal reference. Nothing is lost or misrendered as
 * a link. The serializer emits `[^1]` as `\[^1\]` (backslash-escaped brackets),
 * which renders identically in Markdown — a documented normalization, not a
 * content loss (see docs, known-differences section).
 *
 * Implementation note: `setup` runs on every parse() call, so we wrap md.render
 * only once per markdown-it instance (guarded by a flag in storage closure).
 */
export const FootnoteGuard = Extension.create({
  name: 'footnoteGuard',

  addStorage() {
    return {
      markdown: {
        parse: {
          setup(md: {
            __footnoteGuardWrapped?: boolean
            render: (src: string, env?: unknown) => string
          }) {
            if (md.__footnoteGuardWrapped) return
            md.__footnoteGuardWrapped = true
            const originalRender = md.render.bind(md)
            md.render = (src: string, env?: unknown): string => {
              // Escape the colon after `[^label]` so markdown-it does not treat
              // the line as a link reference definition. Multiline, anchored.
              const guarded = src.replace(
                /^(\s*\[\^[^\]\n]+\])\s*:/gm,
                (_match: string, label: string) => `${label}\\:`
              )
              return originalRender(guarded, env)
            }
          }
        }
      }
    }
  }
})
