// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { isDarkTheme, migrateLegacyTheme, isThemeMode, THEME_OPTIONS } from './theme'

describe('isDarkTheme', () => {
  it('light 以外は全てダーク系と判定する', () => {
    expect(isDarkTheme('light')).toBe(false)
    expect(isDarkTheme('dracula')).toBe(true)
    expect(isDarkTheme('kuroxxx')).toBe(true)
  })
})

describe('migrateLegacyTheme', () => {
  it('旧 dark 値は dracula へ移行する', () => {
    expect(migrateLegacyTheme('dark')).toBe('dracula')
  })

  it('dark 以外の値はそのまま返す', () => {
    expect(migrateLegacyTheme('light')).toBe('light')
    expect(migrateLegacyTheme('kuroxxx')).toBe('kuroxxx')
    expect(migrateLegacyTheme('unknown-value')).toBe('unknown-value')
  })

  it('null はそのまま null を返す', () => {
    expect(migrateLegacyTheme(null)).toBeNull()
  })
})

describe('isThemeMode', () => {
  it('有効な ThemeMode 文字列は true を返す', () => {
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dracula')).toBe(true)
    expect(isThemeMode('kuroxxx')).toBe(true)
  })

  it('無効な文字列は false を返す(旧 dark 値も含む)', () => {
    expect(isThemeMode('dark')).toBe(false)
    expect(isThemeMode('invalid')).toBe(false)
    expect(isThemeMode('')).toBe(false)
  })

  it('null は false を返す', () => {
    expect(isThemeMode(null)).toBe(false)
  })
})

describe('THEME_OPTIONS', () => {
  it('light・dracula・kuroxxx の3件をこの順で持つ', () => {
    expect(THEME_OPTIONS.map((option) => option.mode)).toEqual(['light', 'dracula', 'kuroxxx'])
  })

  it('各オプションはラベルと2色のスウォッチ(背景・アクセント)を#RRGGBB形式で持つ', () => {
    THEME_OPTIONS.forEach((option) => {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.swatchBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(option.swatchAccent).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  it('light の表示ラベルは「ライト」', () => {
    const light = THEME_OPTIONS.find((option) => option.mode === 'light')
    expect(light?.label).toBe('ライト')
  })
})
