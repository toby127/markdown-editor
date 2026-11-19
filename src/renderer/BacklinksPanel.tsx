import { useMemo } from 'react'
import type { IndexedFile } from '../shared/ipc'
import { collectWorkspaceLinks, type LinkTarget } from '../shared/workspace-links'

export type BacklinksPanelProps = {
  files: IndexedFile[]
  currentPath: string | null
  root: string | null
  onOpenFile: (path: string) => void
}

function LinkList({
  label,
  items,
  empty,
  onOpenFile
}: {
  label: string
  items: LinkTarget[]
  empty: string
  onOpenFile: (path: string) => void
}): JSX.Element {
  return (
    <section className="backlinks-section">
      <h3 className="backlinks-heading">
        {label} <span className="backlinks-count">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <div className="backlinks-empty">{empty}</div>
      ) : (
        <ul className="backlinks-list">
          {items.map((item) => (
            <li key={item.path}>
              <button type="button" onClick={() => onOpenFile(item.path)} title={item.path}>
                {item.title ?? item.name}
              </button>
              {item.contexts.length > 0 && (
                <div className="backlinks-contexts">
                  {item.contexts.map((context, index) => (
                    <div key={index}>{context}</div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function BacklinksPanel({
  files,
  currentPath,
  root,
  onOpenFile
}: BacklinksPanelProps): JSX.Element {
  const links = useMemo(
    () => collectWorkspaceLinks(files, currentPath),
    [files, currentPath]
  )

  if (!root) {
    return <div className="tag-panel-empty">打开文件夹后可查看双向链接</div>
  }
  if (!currentPath) {
    return <div className="tag-panel-empty">打开一个文件后可查看双向链接</div>
  }

  return (
    <div className="backlinks-panel">
      <LinkList
        label="出链"
        items={links.outgoing}
        empty="这个文件中没有 [[wiki link]]"
        onOpenFile={onOpenFile}
      />
      <LinkList
        label="反向链接"
        items={links.backlinks}
        empty="还没有其他文件链接到这里"
        onOpenFile={onOpenFile}
      />
    </div>
  )
}
