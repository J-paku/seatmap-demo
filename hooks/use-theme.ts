// テーマ状態のデモ側実装 — 実物はアプリ全体のプロバイダが持つが、デモは
// .seat-map-root の data-theme を切り替えるだけで styles/tokens.css が配色を差し替える
import { useCallback, useEffect, useState } from 'react'
import { isDarkTheme, isThemeMode, migrateLegacyTheme } from '@/types'
import type { ThemeMode } from '@/types'

const THEME_STORAGE_KEY = 'seatmap-demo:theme'
const ROOT_SELECTOR = '.seat-map-root'

const readStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null
  try {
    const migrated = migrateLegacyTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
    return isThemeMode(migrated) ? migrated : null
  } catch {
    // 破損値・ストレージアクセス不可は既定テーマへ
    return null
  }
}

// data-theme と dark クラスを同時に当てる(Tailwind の dark バリアントが移植コードで使われている)
const applyTheme = (mode: ThemeMode): void => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR)
  if (!root) return
  if (mode === 'light') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  root.classList.toggle('dark', isDarkTheme(mode))
}

export function useTheme(): { themeMode: ThemeMode; setTheme: (mode: ThemeMode) => void } {
  // 初回レンダーはサーバー出力と揃えるため既定値。復元は effect で行う
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')

  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) setThemeMode(stored)
  }, [])

  useEffect(() => {
    applyTheme(themeMode)
  }, [themeMode])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // localStorage 不可環境では state のみ反映
    }
  }, [])

  return { themeMode, setTheme }
}

