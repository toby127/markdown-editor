import { useState } from 'react'
import type { DirEntry } from '../shared/fs-types'
import FileTree from './FileTree'
import OutlinePanel from './OutlinePanel'
import TagPanel from './TagPanel'
import SearchPanel from './SearchPanel'
import BacklinksPanel from './BacklinksPanel'
import type { IndexedFile, TagFile } from '../shared/ipc'

export type SidebarProps = {
  root: string | null
  entries: DirEntry[]
  selectedPath?: string | null
  onOpenFolder: () => void
  onOpenFile: (path: string) => void
  onRefreshRequest: () => void
  loadChildren: (dirPath: string) => Promise<DirEntry[] | null>
  onCreateEntry?: (parentPath: string, name: string, kind: 'file' | 'directory') => void
  onRenameEntry?: (path: string, newName: string) => void
  onDeleteEntry?: (path: string) => void
  outlineMarkdown: string | null
  onOutlineJump: (index: number) => void
  treeKey?: string
  treeRefreshToken?: number
  tagFiles?: TagFile[]
  tagError?: string | null
  tagsScanning?: boolean
  onRefreshTags?: () => void
  indexFiles?: IndexedFile[]
  indexError?: string | null
  indexScanning?: boolean
  onRefreshIndex?: () => void
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
  treeKey,
  treeRefreshToken,
  tagFiles = [],
  tagError = null,
  tagsScanning = false,
  onRefreshTags,
  indexFiles = [],
  indexError = null,
  indexScanning = false,
  onRefreshIndex
}: SidebarProps): JSX.Element {
  const [panel, setPanel] = useState<'files' | 'outline' | 'tags' | 'search' | 'links'>('files')

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
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'tags'}
          className={panel === 'tags' ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
          onClick={() => setPanel('tags')}
        >
          标签
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'search'}
          className={panel === 'search' ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
          onClick={() => setPanel('search')}
        >
          搜索
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === 'links'}
          className={panel === 'links' ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
          onClick={() => setPanel('links')}
        >
          反链
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
            refreshToken={treeRefreshToken}
          />
        </div>
      ) : panel === 'outline' ? (
        <div className="sidebar-panel sidebar-panel-outline" role="tabpanel">
          <OutlinePanel markdown={outlineMarkdown} onJump={onOutlineJump} />
        </div>
      ) : panel === 'tags' ? (
        <div className="sidebar-panel sidebar-panel-tags" role="tabpanel">
          <TagPanel
            files={tagFiles}
            error={tagError}
            scanning={tagsScanning}
            root={root}
            onOpenFile={onOpenFile}
            onRefresh={onRefreshTags ?? (() => {})}
          />
        </div>
      ) : panel === 'search' ? (
        <div className="sidebar-panel sidebar-panel-search" role="tabpanel">
          <SearchPanel
            files={indexFiles}
            error={indexError}
            scanning={indexScanning}
            root={root}
            onOpenFile={onOpenFile}
            onRefresh={onRefreshIndex ?? (() => {})}
          />
        </div>
      ) : (
        <div className="sidebar-panel sidebar-panel-links" role="tabpanel">
          <BacklinksPanel
            files={indexFiles}
            currentPath={selectedPath ?? null}
            root={root}
            onOpenFile={onOpenFile}
          />
        </div>
      )}
    </div>
  )
}
