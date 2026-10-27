import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDEBAR_WIDTH_DEFAULT } from './prefs'
import {
  loadPrefsFromFile,
  prefsFilePath,
  savePrefsToFile,
  withSidebarWidth,
  withWindowBounds
} from './prefs-store'

describe('prefsFilePath', () => {
  it('places prefs.json under userData', () => {
    expect(prefsFilePath('/tmp/user-data')).toBe(join('/tmp/user-data', 'prefs.json'))
  })
})

describe('loadPrefsFromFile / savePrefsToFile', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('returns defaults when file is missing', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    expect(loadPrefsFromFile(path)).toEqual({
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      windowBounds: null
    })
  })

  it('round-trips sidebar width and window bounds as JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    const prefs = {
      sidebarWidth: 300,
      windowBounds: {
        x: 10,
        y: 20,
        width: 800,
        height: 600,
        isMaximized: true
      }
    }
    savePrefsToFile(path, prefs)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(prefs)
    expect(loadPrefsFromFile(path)).toEqual(prefs)
  })

  it('falls back to defaults on corrupt JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    writeFileSync(path, '{not-json', 'utf8')
    expect(loadPrefsFromFile(path)).toEqual({
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      windowBounds: null
    })
  })
})

describe('withSidebarWidth / withWindowBounds', () => {
  it('clamps sidebar width updates', () => {
    const base = { sidebarWidth: 220, windowBounds: null }
    expect(withSidebarWidth(base, 50).sidebarWidth).toBe(160)
    expect(withSidebarWidth(base, 500).sidebarWidth).toBe(480)
    expect(withSidebarWidth(base, 275).sidebarWidth).toBe(275)
  })

  it('normalizes window bounds updates', () => {
    const base = { sidebarWidth: 220, windowBounds: null }
    const next = withWindowBounds(base, {
      x: 1.2,
      y: 3.8,
      width: 640.4,
      height: 480.6,
      isMaximized: false
    })
    expect(next.windowBounds).toEqual({
      x: 1,
      y: 4,
      width: 640,
      height: 481,
      isMaximized: false
    })
  })
})
