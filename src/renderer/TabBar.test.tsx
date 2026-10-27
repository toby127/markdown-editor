/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TabBar from './TabBar'

describe('TabBar', () => {
  it('renders titles and reports select/close', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <TabBar
        tabs={[
          { id: '1', path: null, title: '未命名', content: '', dirty: true },
          { id: '2', path: '/a.md', title: 'a.md', content: '', dirty: false }
        ]}
        activeTabId="1"
        onSelect={onSelect}
        onClose={onClose}
      />
    )
    expect(screen.getByText('未命名')).toBeTruthy()
    fireEvent.click(screen.getByText('a.md'))
    expect(onSelect).toHaveBeenCalledWith('2')
    fireEvent.click(screen.getByRole('button', { name: '关闭 a.md' }))
    expect(onClose).toHaveBeenCalledWith('2')
  })
})
