import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDEBAR_WIDTH_DEFAULT, type AppPrefs } from './prefs'
import {
  loadPrefsFromFile,
  prefsFilePath,
  savePrefsToFile,
  withFocusMode,
  withSidebarWidth,
  withSpellcheck,
  withTheme,
  withTypewriterMode,
  withWindowBounds
} from './prefs-store'

const DEFAULT_EXPECTED: AppPrefs = {
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  windowBounds: null,
  theme: 'light',
  focusMode: false,
  typewriterMode: false,
  spellcheck: true,
        language: 'system'
}

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
    expect(loadPrefsFromFile(path)).toEqual(DEFAULT_EXPECTED)
  })

  it('round-trips all prefs as JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    const prefs: AppPrefs = {
      sidebarWidth: 300,
      windowBounds: {
        x: 10,
        y: 20,
        width: 800,
        height: 600,
        isMaximized: true
      },
      theme: 'dark',
      focusMode: true,
      typewriterMode: true,
      spellcheck: false,
        language: 'system'
    }
    savePrefsToFile(path, prefs)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(prefs)
    expect(loadPrefsFromFile(path)).toEqual(prefs)
  })

  it('falls back to defaults on corrupt JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    writeFileSync(path, '{not-json', 'utf8')
    expect(loadPrefsFromFile(path)).toEqual(DEFAULT_EXPECTED)
  })

  it('loads older JSON without new prefs fields', () => {
    dir = mkdtempSync(join(tmpdir(), 'prefs-store-'))
    const path = prefsFilePath(dir)
    writeFileSync(path, JSON.stringify({ sidebarWidth: 250, windowBounds: null }), 'utf8')
    expect(loadPrefsFromFile(path)).toEqual({ ...DEFAULT_EXPECTED, sidebarWidth: 250 })
  })
})

describe('withSidebarWidth / withWindowBounds', () => {
  const base: AppPrefs = { ...DEFAULT_EXPECTED }

  it('clamps sidebar width updates', () => {
    expect(withSidebarWidth(base, 50).sidebarWidth).toBe(160)
    expect(withSidebarWidth(base, 500).sidebarWidth).toBe(480)
    expect(withSidebarWidth(base, 275).sidebarWidth).toBe(275)
  })

  it('normalizes window bounds updates', () => {
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

describe('writing mode / theme pref updaters', () => {
  const base: AppPrefs = { ...DEFAULT_EXPECTED }

  it('withTheme only accepts dark/light', () => {
    expect(withTheme(base, 'dark').theme).toBe('dark')
    expect(withTheme(base, 'light').theme).toBe('light')
    expect(withTheme(base, 'neon').theme).toBe('light')
  })

  it('withFocusMode / withTypewriterMode only accept booleans', () => {
    expect(withFocusMode(base, true).focusMode).toBe(true)
    expect(withFocusMode(base, 'yes').focusMode).toBe(false)
    expect(withTypewriterMode(base, true).typewriterMode).toBe(true)
    expect(withTypewriterMode(base, 1).typewriterMode).toBe(false)
  })

  it('withSpellcheck defaults to on for invalid values', () => {
    expect(withSpellcheck(base, false).spellcheck).toBe(false)
    expect(withSpellcheck(base, true).spellcheck).toBe(true)
    expect(withSpellcheck(base, 'yes').spellcheck).toBe(true)
  })
})
