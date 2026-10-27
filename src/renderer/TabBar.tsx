import type { TabModel } from '../shared/fs-types'

export type TabBarProps = {
  tabs: TabModel[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose
}: TabBarProps): JSX.Element {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={active ? 'tab tab-active' : 'tab'}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-title">
              {tab.dirty ? <span className="tab-dirty" aria-hidden="true" /> : null}
              {tab.title}
            </span>
            <button
              type="button"
              className="tab-close"
              aria-label={`关闭 ${tab.title}`}
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
