import { extractOutline } from '../shared/outline'

export type OutlinePanelProps = {
  markdown: string | null
  onJump: (index: number) => void
}

export default function OutlinePanel({ markdown, onJump }: OutlinePanelProps): JSX.Element {
  const items = extractOutline(markdown ?? '')

  if (items.length === 0) {
    return (
      <div className="outline-panel">
        <p className="outline-panel-empty">暂无大纲</p>
      </div>
    )
  }

  return (
    <div className="outline-panel">
      <ul className="outline-panel-list">
        {items.map((item) => (
          <li key={item.index} className="outline-panel-row">
            <button
              type="button"
              className="outline-panel-item"
              style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem` }}
              onClick={() => onJump(item.index)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
