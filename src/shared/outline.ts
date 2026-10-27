export type OutlineItem = {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  index: number
}

const ATX = /^(#{1,6})\s+(.+?)\s*$/

export function extractOutline(markdown: string): OutlineItem[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const items: OutlineItem[] = []
  let index = 0
  for (const line of lines) {
    const m = ATX.exec(line)
    if (!m) continue
    items.push({ level: m[1].length as OutlineItem['level'], text: m[2], index })
    index += 1
  }
  return items
}
