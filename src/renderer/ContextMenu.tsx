import { useEffect } from 'react'

export type ContextMenuItem = { id: string; label: string; onSelect: () => void }
export type ContextMenuProps = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: MouseEvent) => {
      const root = document.querySelector('[data-context-menu]')
      const t = e.target as Node | null
      if (root && t && !root.contains(t)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [onClose])

  return (
    <ul className="context-menu" data-context-menu role="menu" style={{ left: x, top: y }}>
      {items.map((item) => (
        <li key={item.id} role="none">
          <button
            type="button"
            role="menuitem"
            className="context-menu-item"
            onClick={() => {
              item.onSelect()
              onClose()
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
