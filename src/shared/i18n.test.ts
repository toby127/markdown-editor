import { describe, expect, it } from 'vitest'
import { resolveLanguage, t, type Language } from './i18n'

describe('resolveLanguage', () => {
  it('returns explicit zh/en directly regardless of system locale', () => {
    expect(resolveLanguage('zh', 'en-US')).toBe('zh')
    expect(resolveLanguage('en', 'zh-CN')).toBe('en')
  })

  it('follows system locale for the system preference', () => {
    expect(resolveLanguage('system', 'zh-CN')).toBe('zh')
    expect(resolveLanguage('system', 'zh_TW')).toBe('zh')
    expect(resolveLanguage('system', 'ZH-cn')).toBe('zh')
    expect(resolveLanguage('system', 'en-US')).toBe('en')
    expect(resolveLanguage('system', 'ja-JP')).toBe('en')
  })

  it('defaults undefined preference to system resolution', () => {
    expect(resolveLanguage(undefined as Language | undefined, 'zh-CN')).toBe('zh')
    expect(resolveLanguage(undefined as Language | undefined, 'fr-FR')).toBe('en')
  })
})

describe('t', () => {
  it('picks the Chinese and English strings', () => {
    expect(t('menuFile', 'zh')).toBe('文件')
    expect(t('menuFile', 'en')).toBe('File')
    expect(t('appearanceLanguage', 'zh')).toBe('语言')
    expect(t('appearanceLanguage', 'en')).toBe('Language')
  })

  it('interpolates named {placeholders}', () => {
    expect(t('closeTab', 'en', { name: 'demo.md' })).toBe('Close demo.md')
    expect(t('errLinkTarget', 'zh', { target: 'notes' })).toBe('未找到链接目标：notes')
  })

  it('leaves unknown placeholders untouched and ignores extra params', () => {
    expect(t('closeTab', 'en', { other: 'x' })).toBe('Close {name}')
    expect(t('closeTab', 'en', { name: 'a', extra: 1 })).toBe('Close a')
  })

  it('supports numeric params', () => {
    expect(t('wordCountSummary', 'zh', { words: 12, lines: 3, minutes: 1 })).toContain('12')
    expect(t('wordCountSummary', 'en', { words: 12, lines: 3, minutes: 1 })).toContain('12')
  })
})
