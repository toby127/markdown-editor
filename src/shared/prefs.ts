export const SIDEBAR_WIDTH_MIN = 160
export const SIDEBAR_WIDTH_MAX = 480
export const SIDEBAR_WIDTH_DEFAULT = 220

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

export type DisplayWorkArea = {
  x: number
  y: number
  width: number
  height: number
}

export type AppPrefs = {
  sidebarWidth: number
  windowBounds: WindowBounds | null
}

const DEFAULT_PREFS: AppPrefs = {
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  windowBounds: null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function clampSidebarWidth(width: unknown): number {
  if (!isFiniteNumber(width)) return SIDEBAR_WIDTH_DEFAULT
  const rounded = Math.round(width)
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, rounded))
}

export function clampWindowBounds(
  bounds: Partial<WindowBounds> | null | undefined
): WindowBounds | null {
  if (!bounds || typeof bounds !== 'object') return null
  const { x, y, width, height } = bounds
  if (
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height)
  ) {
    return null
  }
  const w = Math.round(width)
  const h = Math.round(height)
  if (w <= 0 || h <= 0) return null
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: w,
    height: h,
    isMaximized: bounds.isMaximized === true
  }
}

export function keepWindowOnScreen(
  bounds: WindowBounds,
  screen: DisplayWorkArea
): WindowBounds {
  let width = Math.min(bounds.width, screen.width)
  let height = Math.min(bounds.height, screen.height)
  let x = bounds.x
  let y = bounds.y

  const maxX = screen.x + screen.width - width
  const maxY = screen.y + screen.height - height
  if (x < screen.x) x = screen.x
  if (y < screen.y) y = screen.y
  if (x > maxX) x = maxX
  if (y > maxY) y = maxY

  return {
    x,
    y,
    width,
    height,
    isMaximized: bounds.isMaximized
  }
}

export function serializePrefs(prefs: AppPrefs): string {
  const sidebarWidth = clampSidebarWidth(prefs.sidebarWidth)
  const windowBounds = clampWindowBounds(prefs.windowBounds)
  return JSON.stringify({ sidebarWidth, windowBounds })
}

export function parsePrefsJson(raw: string | null): AppPrefs {
  if (raw == null || raw === '') return { ...DEFAULT_PREFS }
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return { ...DEFAULT_PREFS }
    const obj = data as { sidebarWidth?: unknown; windowBounds?: unknown }
    return {
      sidebarWidth: clampSidebarWidth(obj.sidebarWidth),
      windowBounds: clampWindowBounds(
        obj.windowBounds as Partial<WindowBounds> | null | undefined
      )
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}
