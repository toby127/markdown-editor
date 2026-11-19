import { useMemo, useState, type ReactNode } from 'react'
import type { IndexedFile } from '../shared/ipc'
import { searchWorkspace, type SearchHit } from '../shared/workspace-search'

export type SearchPanelProps = {
  files: IndexedFile[]
  error: string | null
  scanning: boolean
  root: string | null
  onOpenFile: (path: string) => void
  onRefresh: () => void
}

function Marked({ text, query }: { text: string; query: string }): ReactNode {
  const at = text.toLowerCase().indexOf(query.toLowerCase())
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

function HitRow({ hit, query }: { hit: SearchHit; query: string }): JSX.Element {
  return (
    <div className="search-hit">
      <span className="search-line">{hit.line}</span>
      <span className="search-snippet">
        <Marked text={hit.snippet} query={query} />
      </span>
    </div>
  )
}

export default function SearchPanel({
  files,
  error,
  scanning,
  root,
  onOpenFile,
  onRefresh
}: SearchPanelProps): JSX.Element {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchWorkspace(files, query), [files, query])

  if (!root) {
    return <div className="tag-panel-empty">打开文件夹后可搜索工作区</div>
  }
  if (error) {
    return <div className="tag-panel-empty">{error}</div>
  }

  const trimmed = query.trim()
  return (
    <div className="search-panel">
      <div className="search-head">
        <input
          type="search"
          aria-label="搜索工作区"
          placeholder="搜索标题和正文…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" onClick={onRefresh} disabled={scanning} title="重建索引">
          {scanning ? '扫描中' : '刷新'}
        </button>
      </div>

      {trimmed === '' ? (
        <div className="search-empty">
          输入关键词搜索 {files.length} 个 Markdown 文件
        </div>
      ) : results.length === 0 ? (
        <div className="search-empty">没有找到「{trimmed}」</div>
      ) : (
        <>
          <div className="search-summary">{results.length} 个文件匹配</div>
          <ul className="search-results">
            {results.map((result) => (
              <li key={result.path} className="search-result">
                <button type="button" onClick={() => onOpenFile(result.path)} title={result.path}>
                  <Marked text={result.title ?? result.name} query={trimmed} />
                </button>
                {result.hits.map((hit) => (
                  <HitRow key={`${result.path}:${hit.line}`} hit={hit} query={trimmed} />
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
