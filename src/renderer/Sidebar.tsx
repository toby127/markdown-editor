import type { DirEntry } from '../shared/fs-types'
import FileTree from './FileTree'
import OutlinePanel from './OutlinePanel'
import TagPanel from './TagPanel'
import SearchPanel from './SearchPanel'
import BacklinksPanel from './BacklinksPanel'
import type { IndexedFile, TagFile } from '../shared/ipc'

/** Which panel the sidebar shows. Controlled by App so native menus and the
 * file-tree context menu can switch it, not just the two visible tabs. */
export type SidebarPanel = 'files' | 'outline' | 'tags' | 'search' | 'links'

/** Canonical tab order. Shared with App so view-menu toggles insert panels in a
 * stable position instead of always appending. */
export const PANEL_ORDER: SidebarPanel[] = ['files', 'outline', 'tags', 'search', 'links']

export const PANEL_LABELS: Record<SidebarPanel, string> = {
  files: '文件',
  outline: '大纲',
  tags: '标签',
  search: '搜索',
  links: '反链'
}

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
  /** Panels the View menu has made visible; one tab is rendered per entry. */
  visiblePanels: SidebarPanel[]
  panel: SidebarPanel
  onPanelChange: (panel: SidebarPanel) => void
  /** Hide a panel entirely (used by the search panel's Esc key). */
  onPanelHide: (panel: SidebarPanel) => void
  /** Make a panel visible and activate it (used by the file-tree context menu). */
  onPanelShow: (panel: SidebarPanel) => void
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
  onRefreshIndex,
  visiblePanels,
  panel,
  onPanelChange,
  onPanelHide,
  onPanelShow
}: SidebarProps): JSX.Element {
  // The search panel is opened from the file-tree context menu. Make it visible
  // first (it is not a permanent tab), then activate it.
  const openSearch = () => onPanelShow('search')

  // Guard against a transient mismatch (e.g. hide the active panel) so we never
  // render an empty/incorrect body.
  const tabs = PANEL_ORDER.filter((p) => visiblePanels.includes(p))
  const active = visiblePanels.includes(panel) ? panel : (tabs[0] ?? 'files')

  return (
    <div className="sidebar">
      <div className="sidebar-tabs" role="tablist" aria-label="侧边栏">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={active === key ? 'sidebar-tab sidebar-tab-active' : 'sidebar-tab'}
            onClick={() => onPanelChange(key)}
          >
            {PANEL_LABELS[key]}
          </button>
        ))}
      </div>
      {active === 'files' ? (
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
            onSearchRequest={openSearch}
            refreshToken={treeRefreshToken}
          />
        </div>
      ) : active === 'outline' ? (
        <div className="sidebar-panel sidebar-panel-outline" role="tabpanel">
          <OutlinePanel markdown={outlineMarkdown} onJump={onOutlineJump} />
        </div>
      ) : active === 'tags' ? (
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
      ) : active === 'search' ? (
        <div className="sidebar-panel sidebar-panel-search" role="tabpanel">
          <SearchPanel
            files={indexFiles}
            error={indexError}
            scanning={indexScanning}
            root={root}
            onOpenFile={onOpenFile}
            onRefresh={onRefreshIndex ?? (() => {})}
            onClose={() => onPanelHide('search')}
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
