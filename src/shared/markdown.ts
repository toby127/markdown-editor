import { Editor } from '@tiptap/core'
import { createMarkdownExtensions } from './md-extensions'

function createHeadlessEditor() {
  return new Editor({
    // Same semantic extensions as the on-screen editor so md -> HTML -> md
    // roundtrips exactly what the user can edit. See md-extensions.ts.
    extensions: createMarkdownExtensions(),
    content: ''
  })
}

export function markdownToHtml(markdown: string): string {
  const editor = createHeadlessEditor()
  try {
    editor.commands.setContent(markdown)
    return editor.getHTML()
  } finally {
    editor.destroy()
  }
}

export function htmlToMarkdown(html: string): string {
  const editor = createHeadlessEditor()
  try {
    editor.commands.setContent(html)
    return editor.storage.markdown.getMarkdown()
  } finally {
    editor.destroy()
  }
}

export function normalizeMarkdown(md: string): string {
  return md.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim() + '\n'
}
