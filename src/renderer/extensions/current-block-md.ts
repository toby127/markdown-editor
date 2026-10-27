// src/renderer/extensions/current-block-md.ts
import type { Editor } from '@tiptap/core'
import {
  DOMParser as PmDOMParser,
  type Node as PMNode,
  type ResolvedPos,
  type Slice
} from '@tiptap/pm/model'

export const SOURCEABLE_TYPES: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'taskList'
])

export function findTopLevelBlock(
  $from: ResolvedPos
): { pos: number; node: PMNode } | null {
  if ($from.depth < 1) return null
  const pos = $from.before(1)
  const node = $from.node(1)
  if (!SOURCEABLE_TYPES.has(node.type.name)) return null
  return { pos, node }
}

export function serializeBlockMarkdown(editor: Editor, node: PMNode): string {
  const doc = editor.state.schema.topNodeType.create(null, node.copy(node.content))
  return editor.storage.markdown.serializer.serialize(doc) as string
}

export function parseMarkdownToSlice(editor: Editor, markdown: string): Slice {
  const html = editor.storage.markdown.parser.parse(markdown) as string
  const wrap = document.createElement('div')
  wrap.innerHTML = html
  const pmDoc = PmDOMParser.fromSchema(editor.schema).parse(wrap)
  return pmDoc.slice(0, pmDoc.content.size)
}
