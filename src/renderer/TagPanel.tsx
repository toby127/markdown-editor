import { useMemo, useState } from 'react'
import type { TagFile } from '../shared/ipc'

export type TagPanelProps = {
  files: TagFile[]
  error: string | null
  scanning: boolean
  root: string | null
  onOpenFile: (path: string) => void
  onRefresh: () => void
}

export default function TagPanel({
  files,
  error,
  scanning,
  root,
  onOpenFile,
  onRefresh
}: TagPanelProps): JSX.Element {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const file of files) {
      for (const tag of file.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) =>
      b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
    )
  }, [files])

  const visible = useMemo(
    () => (activeTag ? files.filter((f) => f.tags.includes(activeTag)) : files),
    [files, activeTag]
  )

  if (!root) {
    return <div className="tag-panel-empty">打开文件夹后可查看标签索引</div>
  }
  if (error) {
    return <div className="tag-panel-empty">{error}</div>
  }
  if (scanning) {
    return <div className="tag-panel-empty">正在扫描标签…</div>
  }
  if (files.length === 0) {
    return (
      <div className="tag-panel-empty">
        没有找到带 tags 的 Markdown 文件
        <button type="button" onClick={onRefresh}>刷新</button>
      </div>
    )
  }

  return (
    <div className="tag-panel">
      <div className="tag-panel-head">
        <span>{tags.length} 个标签 · {files.length} 个文件</span>
        <button type="button" onClick={onRefresh}>刷新</button>
      </div>
      <div className="tag-cloud">
        <button
          type="button"
          className={activeTag === null ? 'tag-chip tag-chip-active' : 'tag-chip'}
          onClick={() => setActiveTag(null)}
        >
          全部
        </button>
        {tags.map(([tag, count]) => (
          <button
            key={tag}
            type="button"
            className={activeTag === tag ? 'tag-chip tag-chip-active' : 'tag-chip'}
            onClick={() => setActiveTag(tag)}
            title={`${count} 个文件`}
          >
            {tag} <span className="tag-count">{count}</span>
          </button>
        ))}
      </div>
      <ul className="tag-files">
        {visible.map((file) => (
          <li key={file.path}>
            <button type="button" onClick={() => onOpenFile(file.path)} title={file.path}>
              {file.title ?? file.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
