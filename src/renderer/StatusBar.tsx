// Bottom status bar: word/character/line counts and estimated reading time.
// Mode toggles (focus / typewriter / theme) are passed as children so this
// component stays a pure display of editor statistics.
import { useState } from 'react'
import type { WordStats } from '../shared/word-count'

export type StatusBarProps = {
  stats: WordStats
  children?: React.ReactNode
}

export function StatusBar({ stats, children }: StatusBarProps): JSX.Element {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div className="status-bar">
      <button
        type="button"
        className="status-bar-stats"
        aria-expanded={detailOpen}
        onClick={() => setDetailOpen((v) => !v)}
        title="字数统计"
      >
        {stats.words} 字 · {stats.lines} 行 · 约 {stats.readingMinutes} 分钟
      </button>
      {detailOpen && (
        <div className="status-bar-detail" role="status">
          <span>字数 {stats.words}</span>
          <span>字符（不含空白）{stats.characters}</span>
          <span>行数 {stats.lines}</span>
          <span>阅读约 {stats.readingMinutes} 分钟</span>
        </div>
      )}
      {children && <div className="status-bar-actions">{children}</div>}
    </div>
  )
}

export default StatusBar
