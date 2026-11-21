// Document-internal find & replace floating bar (Ctrl+F). All highlighting is
// driven by the DocumentSearch extension via Decorations; this component only
// owns the form state and dispatches commands.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import {
  focusCurrentMatch,
  readDocumentSearch
} from './extensions/DocumentSearch'
import type { SearchOptions } from '../shared/doc-search'

export type FindMode = 'find' | 'replace'

export type FindBarProps = {
  editor: TiptapEditor | null
  mode: FindMode
  onModeChange: (mode: FindMode) => void
  onClose: () => void
}

export function FindBar({ editor, mode, onModeChange, onClose }: FindBarProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [options, setOptions] = useState<SearchOptions>({ caseSensitive: false, wholeWord: false })
  const [counts, setCounts] = useState({ total: 0, current: -1 })
  const queryRef = useRef<HTMLInputElement>(null)

  // Keep the counter in sync with editor transactions (typing, matches, edits).
  useEffect(() => {
    if (!editor) return
    const sync = () => {
      const s = readDocumentSearch(editor)
      setCounts({ total: s.matches.length, current: s.currentIndex })
    }
    sync()
    editor.on('transaction', sync)
    return () => {
      editor.off('transaction', sync)
    }
  }, [editor])

  useEffect(() => {
    queryRef.current?.focus()
    queryRef.current?.select()
  }, [])

  // Re-run search whenever query or search options change.
  useEffect(() => {
    if (!editor) return
    editor.commands.setSearchQuery(query, options)
    if (query) focusCurrentMatch(editor)
  }, [editor, query, options])

  const label = counts.total === 0 ? '无结果' : `${counts.current + 1} / ${counts.total}`

  const move = (direction: 1 | -1) => {
    if (!editor) return
    const ok = direction === 1 ? editor.commands.nextMatch() : editor.commands.previousMatch()
    if (ok) focusCurrentMatch(editor)
  }

  const doReplace = (all: boolean) => {
    if (!editor || !query) return
    if (all) {
      editor.commands.replaceAll(replacement)
    } else {
      const changed = editor.commands.replaceCurrent(replacement)
      if (changed) {
        // Re-apply the query so the match list reflects the edited document.
        editor.commands.setSearchQuery(query, options)
        focusCurrentMatch(editor)
      }
    }
  }

  const handleQueryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      move(e.shiftKey ? -1 : 1)
    }
  }

  const handleReplaceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      doReplace(false)
    }
  }

  return (
    <div className="find-bar" role="search" aria-label="文档内查找">
      <div className="find-bar-row">
        <input
          ref={queryRef}
          className="find-bar-input"
          type="text"
          value={query}
          placeholder="查找…"
          aria-label="查找内容"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleQueryKeyDown}
        />
        <span className="find-bar-count" data-testid="find-count" aria-live="polite">
          {label}
        </span>
        <button type="button" title="上一个 (Shift+Enter)" aria-label="上一个匹配" onClick={() => move(-1)}>
          ↑
        </button>
        <button type="button" title="下一个 (Enter)" aria-label="下一个匹配" onClick={() => move(1)}>
          ↓
        </button>
        <button
          type="button"
          className={mode === 'replace' ? 'find-bar-toggle-active' : ''}
          title="切换替换栏"
          aria-label="切换替换栏"
          aria-expanded={mode === 'replace'}
          onClick={() => onModeChange(mode === 'replace' ? 'find' : 'replace')}
        >
          ⇄
        </button>
        <button type="button" title="关闭 (Esc)" aria-label="关闭查找" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="find-bar-row find-bar-options">
        <label>
          <input
            type="checkbox"
            checked={options.caseSensitive ?? false}
            onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))}
          />
          区分大小写
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.wholeWord ?? false}
            onChange={(e) => setOptions((o) => ({ ...o, wholeWord: e.target.checked }))}
          />
          全词匹配
        </label>
      </div>

      {mode === 'replace' && (
        <div className="find-bar-row find-bar-replace">
          <input
            className="find-bar-input"
            type="text"
            value={replacement}
            placeholder="替换为…"
            aria-label="替换为"
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
          />
          <button type="button" title="替换当前 (Enter)" onClick={() => doReplace(false)}>
            替换
          </button>
          <button type="button" title="替换全部" onClick={() => doReplace(true)}>
            全部
          </button>
        </div>
      )}
    </div>
  )
}

export default FindBar
