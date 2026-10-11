// テーマ状態のデモ側実装 — 実物はアプリ全体のプロバイダが持つが、デモは
// .seat-map-root の data-theme を切り替えるだけで styles/tokens.css が配色を差し替える
import { useCallback, useEffect, useState } from 'react'
import { readStoredTheme, writeStoredTheme } from '@/lib/persist-theme'
import { applyTheme } from '@/utils/apply-theme'
import type { ThemeMode } from '@/types'

export function useTheme(): { themeMode: ThemeMode; setTheme: (mode: ThemeMode) => void } {
  // 初回レンダーはサーバー出力と揃えるため既定値。復元は effect で行う
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')

  useEffect(() => {
    const stored = readStoredTheme()
    // localStorage はクライアント専用。SSR 出力と初回クライアント出力を揃えるため、復元は effect でしか行えない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setThemeMode(stored)
  }, [])

  useEffect(() => {
    applyTheme(themeMode)
  }, [themeMode])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
    writeStoredTheme(mode)
  }, [])

  return { themeMode, setTheme }
}
