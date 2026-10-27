import { describe, expect, it } from 'vitest'
import { IpcChannels } from './ipc'
import type { MarkdownEditorApi } from './ipc'

describe('confirmSave IPC', () => {
  it('uses dialog:confirmSave channel name', () => {
    expect(IpcChannels.confirmSave).toBe('dialog:confirmSave')
  })

  it('exposes onRequestClose as app:requestClose', () => {
    expect(IpcChannels.onRequestClose).toBe('app:requestClose')
  })

  it('includes confirmSave and onRequestClose on the API surface', () => {
    const api = {
      openFile: async () => ({ ok: false as const, canceled: true as const }),
      saveFile: async () => ({ ok: false as const, canceled: true as const }),
      saveFileAs: async () => ({ ok: false as const, canceled: true as const }),
      setDirty: async () => undefined,
      closeWindow: async () => undefined,
      onMenuAction: () => () => undefined,
      syncMenuState: async () => undefined,
      openFolder: async () => ({ ok: false as const, canceled: true as const }),
      listDir: async () => ({ ok: false as const, error: 'x' }),
      readFile: async () => ({ ok: false as const, error: 'x' }),
      createEntry: async () => ({ ok: false as const, error: 'x' }),
      renameEntry: async () => ({ ok: false as const, error: 'x' }),
      deleteEntry: async () => ({ ok: false as const, error: 'x' }),
      onOpenPaths: () => () => undefined,
      getPathForFile: (_file: File) => '',
      confirmSave: async (_message: string): Promise<'save' | 'discard' | 'cancel'> => 'cancel',
      onRequestClose: (handler: () => void) => {
        void handler
        return () => undefined
      },
      abortClose: async () => undefined,
      getSidebarWidth: async () => 220,
      setSidebarWidth: async (width: number) => width
    } satisfies MarkdownEditorApi

    expect(typeof api.confirmSave).toBe('function')
    expect(typeof api.onRequestClose).toBe('function')
  })
})
