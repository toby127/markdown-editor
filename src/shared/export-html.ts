import hljs from 'highlight.js'
import { sanitizeHtmlString } from './sanitize'
import { createHeadingSlugger } from './slugger'

/**
 * Build a standalone, self-contained HTML document for export.
 *
 * Takes the editor's HTML (from markdownToHtml), applies syntax highlighting
 * to fenced code blocks via highlight.js, and wraps everything in a document
 * with embedded CSS — no external assets, so the exported file renders
 * identically offline.
 */

const EXPORT_CSS = `
:root { color-scheme: light; }
body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  line-height: 1.6; color: #24292f; max-width: 860px; margin: 40px auto;
  padding: 0 24px; }
h1,h2,h3,h4,h5,h6 { line-height: 1.25; margin: 1.4em 0 0.6em; }
h1 { border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
h2 { border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
a { color: #0969da; text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote { margin: 1em 0; padding: 0 1em; color: #57606a;
  border-left: 4px solid #d0d7de; }
code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  background: rgba(175,184,193,.2); padding: .2em .4em; border-radius: 6px;
  font-size: 85%; }
pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto;
  line-height: 1.45; }
pre code { background: none; padding: 0; font-size: 100%; }
table { border-collapse: collapse; margin: 1em 0; }
th,td { border: 1px solid #d0d7de; padding: 6px 13px; }
th { background: #f6f8fa; }
img { max-width: 100%; }
input[type=checkbox] { margin-right: .4em; }
hr { border: 0; border-top: 1px solid #d0d7de; margin: 24px 0; }
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-type { color: #cf222e; }
.hljs-string,.hljs-attr,.hljs-template-variable { color: #0a3069; }
.hljs-number,.hljs-symbol,.hljs-bullet { color: #0550ae; }
.hljs-comment,.hljs-quote { color: #6e7781; font-style: italic; }
.hljs-title,.hljs-function .hljs-title,.hljs-built_in { color: #8250df; }
.hljs-variable,.hljs-params { color: #953800; }
.hljs-meta { color: #0550ae; }
@media print { body { margin: 0; max-width: none; } }
`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightCodeBlocks(bodyHtml: string): string {
  const template = document.createElement('template')
  template.innerHTML = bodyHtml
  const blocks = template.content.querySelectorAll('pre > code')

  blocks.forEach((code) => {
    const classAttr = code.getAttribute('class') ?? ''
    const match = classAttr.match(/language-([\w+#.-]+)/)
    const raw = code.textContent ?? ''
    const lang = match?.[1] ?? ''
    const wrapper = code.parentElement
    if (!wrapper) return

    let inner: string
    if (lang && hljs.getLanguage(lang)) {
      try {
        inner = hljs.highlight(raw, { language: lang, ignoreIllegals: true }).value
      } catch {
        inner = escapeHtml(raw)
      }
    } else {
      inner = escapeHtml(raw)
    }

    wrapper.innerHTML = `<code class="hljs">${inner}</code>`
  })

  return template.innerHTML
}

/**
 * Add stable ids to headings so TOC links (`#slug`) resolve in the exported
 * document. Uses the same slugger as TOC insertion, walking headings in order.
 */
function addHeadingIds(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const slug = createHeadingSlugger()
  template.content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    if (heading.hasAttribute('id')) return
    heading.id = slug(heading.textContent ?? '')
  })
  return template.innerHTML
}

export function buildExportHtml(bodyHtml: string, title: string): string {
  // Defense in depth: sanitize even though bodyHtml came from the editor.
  const safe = sanitizeHtmlString(bodyHtml)
  const highlighted = addHeadingIds(highlightCodeBlocks(safe))
  const safeTitle = escapeHtml(title)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${highlighted}
</body>
</html>
`
}
