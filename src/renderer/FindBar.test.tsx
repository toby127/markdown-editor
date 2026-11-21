/** @vitest-environment happy-dom */
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import { createMarkdownExtensions } from '../shared/md-extensions'
import { DocumentSearch } from './extensions/DocumentSearch'
import FindBar from './FindBar'

afterEach(() => cleanup())

function setup(markdown = 'hello hello world') {
  const editor = new Editor({
    extensions: [...createMarkdownExtensions(), DocumentSearch],
    content: markdown
  })
  const onModeChange = vi.fn()
  const onClose = vi.fn()
  render(
    <FindBar editor={editor} mode="find" onModeChange={onModeChange} onClose={onClose} />
  )
  return { editor, onModeChange, onClose }
}

describe('FindBar', () => {
  it('shows match count as query is typed', () => {
    const { editor } = setup()
    const input = screen.getByLabelText('查找内容') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(screen.getByTestId('find-count').textContent).toBe('1 / 2')
    editor.destroy()
  })

  it('shows 无结果 for no matches', () => {
    const { editor } = setup()
    const input = screen.getByLabelText('查找内容') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'zzzz' } })
    expect(screen.getByTestId('find-count').textContent).toBe('无结果')
    editor.destroy()
  })

  it('next button advances the current match', () => {
    const { editor } = setup()
    const input = screen.getByLabelText('查找内容') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(screen.getByTestId('find-count').textContent).toBe('1 / 2')
    fireEvent.click(screen.getByLabelText('下一个匹配'))
    expect(screen.getByTestId('find-count').textContent).toBe('2 / 2')
    editor.destroy()
  })

  it('switching to replace mode shows replacement field', () => {
    const { editor, onModeChange } = setup()
    fireEvent.click(screen.getByLabelText('切换替换栏'))
    expect(onModeChange).toHaveBeenCalledWith('replace')
    editor.destroy()
  })

  it('replace mode renders input and 替换/全部 buttons', () => {
    const editor = new Editor({
      extensions: [...createMarkdownExtensions(), DocumentSearch],
      content: 'a a a'
    })
    render(
      <FindBar editor={editor} mode="replace" onModeChange={() => {}} onClose={() => {}} />
    )
    expect(screen.getByLabelText('替换为')).toBeTruthy()
    expect(screen.getByText('替换')).toBeTruthy()
    expect(screen.getByText('全部')).toBeTruthy()
    editor.destroy()
  })

  it('Escape closes the bar', () => {
    const { editor, onClose } = setup()
    const input = screen.getByLabelText('查找内容') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    editor.destroy()
  })
})
