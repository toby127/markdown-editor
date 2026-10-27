export type DirEntry = { name: string; path: string; kind: 'file' | 'directory' }

export type TabModel = {
  id: string
  path: string | null
  title: string
  content: string
  dirty: boolean
}
