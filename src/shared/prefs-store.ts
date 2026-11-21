import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  clampBool,
  clampSidebarWidth,
  clampTheme,
  clampWindowBounds,
  parsePrefsJson,
  serializePrefs,
  type AppPrefs,
  type Theme,
  type WindowBounds
} from './prefs'

export const PREFS_FILENAME = 'prefs.json'

export function prefsFilePath(userDataPath: string): string {
  return join(userDataPath, PREFS_FILENAME)
}

export function loadPrefsFromFile(filePath: string): AppPrefs {
  try {
    return parsePrefsJson(readFileSync(filePath, 'utf8'))
  } catch {
    return parsePrefsJson(null)
  }
}

export function savePrefsToFile(filePath: string, prefs: AppPrefs): void {
  writeFileSync(filePath, serializePrefs(prefs), 'utf8')
}

export function withSidebarWidth(prefs: AppPrefs, width: unknown): AppPrefs {
  return {
    ...prefs,
    sidebarWidth: clampSidebarWidth(width)
  }
}

export function withWindowBounds(
  prefs: AppPrefs,
  bounds: Partial<WindowBounds> | null | undefined
): AppPrefs {
  return {
    ...prefs,
    windowBounds: clampWindowBounds(bounds)
  }
}

export function withTheme(prefs: AppPrefs, theme: unknown): AppPrefs {
  return { ...prefs, theme: clampTheme(theme) }
}

export function withFocusMode(prefs: AppPrefs, value: unknown): AppPrefs {
  return { ...prefs, focusMode: clampBool(value) }
}

export function withTypewriterMode(prefs: AppPrefs, value: unknown): AppPrefs {
  return { ...prefs, typewriterMode: clampBool(value) }
}

export function withSpellcheck(prefs: AppPrefs, value: unknown): AppPrefs {
  return { ...prefs, spellcheck: clampBool(value, true) }
}
