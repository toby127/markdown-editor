/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import OutlinePanel from './OutlinePanel'

afterEach(() => cleanup())

describe('OutlinePanel', () => {
  it('shows empty hint when markdown is null or has no headings', () => {
    const { rerender } = render(<OutlinePanel markdown={null} onJump={vi.fn()} />)
    expect(screen.getByText('暂无大纲')).toBeTruthy()

    rerender(<OutlinePanel markdown={'hello\n\nworld'} onJump={vi.fn()} />)
    expect(screen.getByText('暂无大纲')).toBeTruthy()
  })

  it('lists headings and calls onJump with heading index on click', () => {
    const onJump = vi.fn()
    render(
      <OutlinePanel markdown={'# One\n\n## Two\n\n### Three\n'} onJump={onJump} />
    )
    expect(screen.getByRole('button', { name: 'One' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Two' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Three' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(onJump).toHaveBeenCalledWith(1)
  })
})
