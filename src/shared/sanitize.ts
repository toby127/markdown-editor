/**
 * Sanitize raw HTML embedded in Markdown before it reaches ProseMirror.
 *
 * The app runs tiptap-markdown with `html: true` (required for HTML roundtrip),
 * which disables markdown-it's "safe by default" guarantee. Raw HTML in a .md
 * file can carry `<script>`, inline `on*` handlers and `javascript:` URLs.
 *
 * Sanitization happens on the markdown-it html token *strings*, before any
 * DOMParser sees them — otherwise <script> can execute in environments whose
 * parser runs scripts. We use targeted string stripping rather than a full
 * HTML parse/rebuild because markdown-it splits inline HTML into separate
 * open/close tokens (e.g. `<u>` and `</u>`); rebuilding each fragment as a
 * DOM subtree would break tag pairing and corrupt legitimate formatting.
 *
 * Strategy:
 *  - Remove whole dangerous elements (script/style/iframe/...) incl. content.
 *  - Strip `on*` event attributes, inline style, srcdoc, formaction.
 *  - Strip dangerous href/src protocols (javascript:, vbscript:, non-image
 *    data:).
 * Everything else is left byte-for-byte, preserving editor fidelity (task
 * list checkboxes, table structure, data-* attrs, custom formatting).
 */

// Elements removed entirely, including their inner content. Matched with a
// non-greedy body and case-insensitive; nested same-tag content is rare in
// markdown raw HTML and a second pass handles the common nested case.
const DANGEROUS_ELEMENTS = [
  'script', 'style', 'iframe', 'object', 'embed', 'form',
  'button', 'select', 'textarea', 'link', 'meta', 'base'
]

function stripDangerousElements(html: string): string {
  let out = html
  for (const tag of DANGEROUS_ELEMENTS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi')
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    let prev: string
    do {
      prev = out
      out = out.replace(re, '').replace(selfClosing, '')
    } while (out !== prev)
  }
  return out
}

// Matches an attribute with an `on*` name, or an explicitly forbidden one.
// Consumes trailing whitespace so removal doesn't leave doubled spaces.
const ATTR_STRIP = /\s+(?:on\w+|style|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)(?=\s|\/?>)/gi

// Matches href/src whose value begins with a dangerous protocol (allowing
// whitespace/control chars, which browsers ignore when resolving URLs).
const URL_STRIP = /(\s)(href|src|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi

function isDangerousUrl(value: string): boolean {
  const v = value.replace(/[\u0000-\u0020]/g, '').toLowerCase()
  return (
    v.startsWith('javascript:') ||
    v.startsWith('vbscript:') ||
    (v.startsWith('data:') && !v.startsWith('data:image/'))
  )
}

/**
 * Sanitize an HTML fragment string. Safe HTML is preserved verbatim.
 */
export function sanitizeHtmlString(html: string): string {
  if (!html) return html
  let out = stripDangerousElements(html)
  out = out.replace(ATTR_STRIP, '')
  out = out.replace(URL_STRIP, (match, _space: string, _name: string, dq?: string, sq?: string, bare?: string) => {
    const value = dq ?? sq ?? bare ?? ''
    return isDangerousUrl(value) ? '' : match
  })
  return out
}

/**
 * Sanitize a live DOM element in place (defense in depth). Kept as a separate
 * export for callers that already hold a parsed element; uses the inert
 * <template> DOM so no script can execute during the walk.
 */
export function sanitizeRenderedDom<T extends Element>(element: T): T {
  const html = sanitizeHtmlString(element.innerHTML)
  const template = document.createElement('template')
  template.innerHTML = html
  element.innerHTML = template.innerHTML
  return element
}
