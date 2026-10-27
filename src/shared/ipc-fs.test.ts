import { describe, expect, it } from 'vitest'
import { IpcChannels } from './ipc'

describe('IpcChannels fs extensions', () => {
  it('defines folder and CRUD channels', () => {
    expect(IpcChannels.openFolder).toBe('folder:open')
    expect(IpcChannels.listDir).toBe('fs:listDir')
    expect(IpcChannels.readFile).toBe('fs:readFile')
    expect(IpcChannels.createEntry).toBe('fs:createEntry')
    expect(IpcChannels.renameEntry).toBe('fs:renameEntry')
    expect(IpcChannels.deleteEntry).toBe('fs:deleteEntry')
    expect(IpcChannels.onOpenPaths).toBe('app:openPaths')
  })
})
