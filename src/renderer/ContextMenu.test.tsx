/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import ContextMenu from './ContextMenu'

afterEach(() => cleanup())

describe('ContextMenu', () => {
  it('renders items and calls onSelect then onClose', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <ContextMenu
        x={10}
        y={20}
        onClose={onClose}
        items={[{ id: 'rename', label: '重命名', onSelect }]}
      />
    )
    fireEvent.click(screen.getByRole('menuitem', { name: '重命名' }))
    expect(onSelect).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <ContextMenu
        x={0}
        y={0}
        onClose={onClose}
        items={[{ id: 'a', label: '删除', onSelect: vi.fn() }]}
      />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
