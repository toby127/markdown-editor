import { useState } from 'react'
import type { DirEntry } from '../shared/fs-types'
import FileTree from './FileTree'
import OutlinePanel from './OutlinePanel'

export type SidebarProps = {
  root: string | null
  entries: DirEntry[]
  selectedPath?: string | null
  onOpenFolder: () => void
  onOpenFile: (path: string) => void
  onRefreshRequest: () => void
  loadChildren: (dirPath: string) => Promise<DirEntry[]>
  onCreateEntry?: (parentPath: string, name: string, kind: 'file' | 'directory') => void
  onRenameEntry?: (path: string, newName: string) => void
  onDeleteEntry?: (path: string) => void
  outlineMarkdown: string | null
  onOutlineJump: (index: number) => void
  treeKey?: string
}

export default function Sidebar({
  root,
  entries,
  selectedPath,
  onOpenFolder,
  onOpenFile,
  onRefreshRequest,
  loadChildren,
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  outlineMarkdown,
  onOutlineJump,
  treeKey
}: SidebarProps): JSX.Element {
  const [panel, setPanel] = useState<'files' | 'outline'>('files')

  return (
    <div className="sidebar">
      <div className="sidebar-tabs" role="tablist" aria-label="侧边栏">
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'files'}
          className={panel === 'files' ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
          onClick={() => setPanel('files')}
        >
          文件
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'outline'}
          className={panel === 'outline' ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
          onClick={() => setPanel('outline')}
        >
          大纲
        </button>
      </div>
      {panel === 'files' ? (
        <div className="sidebar-panel sidebar-panel-files" role="tabpanel">
          <FileTree
            key={treeKey}
            root={root}
            entries={entries}
            selectedPath={selectedPath}
            onOpenFolder={onOpenFolder}
            onOpenFile={onOpenFile}
            onRefreshRequest={onRefreshRequest}
            loadChildren={loadChildren}
            onCreateEntry={onCreateEntry}
            onRenameEntry={onRenameEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </div>
      ) : (
        <div className="sidebar-panel sidebar-panel-outline" role="tabpanel">
          <OutlinePanel markdown={outlineMarkdown} onJump={onOutlineJump} />
        </div>
      )}
    </div>
  )
}
