import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  clampSidebarWidth,
  clampWindowBounds,
  keepWindowOnScreen,
  parsePrefsJson,
  serializePrefs,
  type AppPrefs,
  type WindowBounds
} from './prefs'

describe('clampSidebarWidth', () => {
  it('uses default for non-finite values', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_WIDTH_DEFAULT)
    expect(clampSidebarWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR_WIDTH_DEFAULT)
    expect(clampSidebarWidth(undefined)).toBe(SIDEBAR_WIDTH_DEFAULT)
    expect(clampSidebarWidth(null)).toBe(SIDEBAR_WIDTH_DEFAULT)
  })

  it('clamps below min to 160 and above max to 480', () => {
    expect(SIDEBAR_WIDTH_MIN).toBe(160)
    expect(SIDEBAR_WIDTH_MAX).toBe(480)
    expect(SIDEBAR_WIDTH_DEFAULT).toBe(220)
    expect(clampSidebarWidth(100)).toBe(160)
    expect(clampSidebarWidth(600)).toBe(480)
  })

  it('leaves in-range widths unchanged (rounded to integer)', () => {
    expect(clampSidebarWidth(220)).toBe(220)
    expect(clampSidebarWidth(160)).toBe(160)
    expect(clampSidebarWidth(480)).toBe(480)
    expect(clampSidebarWidth(275.7)).toBe(276)
  })
})

describe('clampWindowBounds', () => {
  it('returns null for missing or invalid bounds', () => {
    expect(clampWindowBounds(null)).toBeNull()
    expect(clampWindowBounds(undefined)).toBeNull()
    expect(clampWindowBounds({})).toBeNull()
    expect(clampWindowBounds({ x: 0, y: 0, width: 0, height: 100 })).toBeNull()
  })

  it('normalizes finite bounds and isMaximized', () => {
    const bounds = clampWindowBounds({
      x: 10.4,
      y: 20.6,
      width: 960.2,
      height: 720.8,
      isMaximized: true
    })
    expect(bounds).toEqual({
      x: 10,
      y: 21,
      width: 960,
      height: 721,
      isMaximized: true
    })
  })

  it('defaults isMaximized to false when omitted', () => {
    expect(
      clampWindowBounds({ x: 0, y: 0, width: 960, height: 720 })
    ).toEqual({
      x: 0,
      y: 0,
      width: 960,
      height: 720,
      isMaximized: false
    })
  })
})

describe('keepWindowOnScreen', () => {
  it('shifts window fully into the display work area', () => {
    const off: WindowBounds = {
      x: -200,
      y: -50,
      width: 400,
      height: 300,
      isMaximized: false
    }
    const screen = { x: 0, y: 0, width: 1280, height: 800 }
    expect(keepWindowOnScreen(off, screen)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      isMaximized: false
    })
  })

  it('shrinks oversized window to fit the work area', () => {
    const huge: WindowBounds = {
      x: 100,
      y: 100,
      width: 2000,
      height: 1500,
      isMaximized: false
    }
    const screen = { x: 0, y: 0, width: 1280, height: 800 }
    const result = keepWindowOnScreen(huge, screen)
    expect(result.width).toBeLessThanOrEqual(1280)
    expect(result.height).toBeLessThanOrEqual(800)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
    expect(result.x + result.width).toBeLessThanOrEqual(1280)
    expect(result.y + result.height).toBeLessThanOrEqual(800)
  })
})

describe('serializePrefs / parsePrefsJson', () => {
  it('round-trips sidebar width and window bounds', () => {
    const prefs: AppPrefs = {
      sidebarWidth: 300,
      windowBounds: {
        x: 40,
        y: 60,
        width: 960,
        height: 720,
        isMaximized: false
      }
    }
    const raw = serializePrefs(prefs)
    expect(parsePrefsJson(raw)).toEqual(prefs)
  })

  it('clamps sidebar width on parse and tolerates bad json', () => {
    expect(parsePrefsJson(null)).toEqual({
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      windowBounds: null
    })
    expect(parsePrefsJson('not-json')).toEqual({
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      windowBounds: null
    })
    expect(parsePrefsJson(JSON.stringify({ sidebarWidth: 999, windowBounds: null }))).toEqual({
      sidebarWidth: SIDEBAR_WIDTH_MAX,
      windowBounds: null
    })
  })
})
