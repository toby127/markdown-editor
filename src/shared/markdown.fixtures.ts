/**
 * Golden fixtures for Markdown roundtrip fidelity (md -> doc -> md).
 *
 * Each case must survive `markdownToHtml` + `htmlToMarkdown` unchanged after
 * `normalizeMarkdown`. Adding a new syntax to the editor MUST start by adding
 * a fixture here — that is the regression net for "open, edit, save" fidelity.
 *
 * NOTE: some syntax is intentionally excluded from strict byte-for-byte
 * roundtrip because the current serializer normalizes it:
 *   - blockquote soft line breaks: `> a\n> b` collapses to `> a b`
 *   - link titles: `[t](url "title")` drops `"title"`
 *   - hard breaks: two trailing spaces become a backslash break
 *   - task list blank lines: consecutive `- [ ]` items get a blank line between
 *     them (tiptap-markdown serializes taskList as a loose list; tightLists
 *     only covers bullet/ordered lists). Content and checked state survive —
 *     covered by a semantic roundtrip test instead of the strict byte set.
 * These are known normalizations, not regressions; keep them out of the
 * strict set until the serializer is upgraded to preserve them.
 */

export type MarkdownFixture = { name: string; markdown: string }

export const ROUNDTRIP_FIXTURES: MarkdownFixture[] = [
  { name: 'heading', markdown: '# H1\n\n## H2\n\n### H3\n' },
  {
    name: 'emphasis',
    markdown: 'a **bold** b *italic* c ~~strike~~ d `code`\n'
  },
  { name: 'unordered list', markdown: '- one\n- two\n  - nested\n' },
  { name: 'ordered list', markdown: '1. one\n2. two\n' },
  { name: 'blockquote', markdown: '> single line\n' },
  { name: 'plain link', markdown: '[text](https://example.com)\n' },
  { name: 'inline code block', markdown: '```\nconst x = 1\n```\n' },
  { name: 'code block with lang', markdown: '```js\nconst x = 1\n```\n' },
  { name: 'highlight', markdown: '==marked==\n' },
  { name: 'horizontal rule', markdown: '---\n' },
  { name: 'underline', markdown: 'under<u>line</u>\n' },
  { name: 'image', markdown: '![alt](https://example.com/a.png)\n' },
  { name: 'gfm table', markdown: '| A | B |\n| --- | --- |\n| 1 | 2 |\n' },
  { name: 'superscript', markdown: 'x^2^ and E = mc^2^\n' },
  { name: 'subscript', markdown: 'H~2~O and CO~2~\n' },
  { name: 'footnote', markdown: 'text[^1]\n\n[^1]: note here\n' },
  { name: 'yaml front matter', markdown: '---\ntitle: hello\ntags: [a, b]\n---\n\nBody\n' },
  { name: 'math block', markdown: '$$\nE = mc^2\n$$\n' },
  { name: 'inline math', markdown: 'Use $x^2$ here\n' },
  { name: 'html source block', markdown: '```html\n<div class="note">hi</div>\n```\n' },
  { name: 'toc links', markdown: '- [Intro](#intro)\n  - [Details](#details)\n' },
  { name: 'wiki links', markdown: 'see [[Target]] and [[Other|Alias]] here\n' }
]
