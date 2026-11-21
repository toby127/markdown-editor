/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatusBar from './StatusBar'
import type { WordStats } from '../shared/word-count'

describe('StatusBar', () => {
  let container: HTMLDivElement
  let root: Root
  const stats: WordStats = { words: 12, characters: 40, lines: 3, readingMinutes: 1 }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // @ts-expect-error vitest global
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the word/line/reading summary', async () => {
    await act(async () => {
      root.render(<StatusBar stats={stats} />)
    })
    const btn = container.querySelector('.status-bar-stats') as HTMLButtonElement
    expect(btn.textContent).toContain('12 字')
    expect(btn.textContent).toContain('3 行')
    expect(btn.textContent).toContain('约 1 分钟')
  })

  it('toggles the detail popover on click', async () => {
    await act(async () => {
      root.render(<StatusBar stats={stats} />)
    })
    const btn = container.querySelector('.status-bar-stats') as HTMLButtonElement
    expect(container.querySelector('.status-bar-detail')).toBeNull()
    await act(async () => {
      btn.click()
    })
    expect(container.querySelector('.status-bar-detail')?.textContent).toContain('字符（不含空白）40')
    await act(async () => {
      btn.click()
    })
    expect(container.querySelector('.status-bar-detail')).toBeNull()
  })

  it('renders children as action buttons', async () => {
    await act(async () => {
      root.render(
        <StatusBar stats={stats}>
          <button type="button" className="status-bar-action">专</button>
        </StatusBar>
      )
    })
    expect(container.querySelector('.status-bar-actions .status-bar-action')?.textContent).toBe('专')
  })
})
