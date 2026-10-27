import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'

function createHeadlessEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      // html: true (library default) — setContent always routes strings through
      // markdown-it; html:false escapes HTML tags so htmlToMarkdown cannot work.
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true })
    ],
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
