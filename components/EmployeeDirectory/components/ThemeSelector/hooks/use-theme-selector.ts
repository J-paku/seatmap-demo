// テーマ選択ポップオーバーのロジック — 開閉状態と選択ハンドラ・現在テーマを提供する
import { useState, useCallback } from 'react'
import { THEME_OPTIONS } from '@/utils/theme'
import type { ThemeOption } from '@/utils/theme'
import type { ThemeMode } from '@/types'

interface UseThemeSelectorParams {
  themeMode: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

interface UseThemeSelectorResult {
  options: readonly ThemeOption[]
  currentOption: ThemeOption
  isOpen: boolean
  toggleOpen: () => void
  handleSelect: (mode: ThemeMode) => void
}

export function useThemeSelector({
  themeMode,
  setTheme,
}: UseThemeSelectorParams): UseThemeSelectorResult {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleSelect = useCallback(
    (mode: ThemeMode) => {
      setTheme(mode)
      setIsOpen(false)
    },
    [setTheme]
  )

  // 現在テーマの色情報 — トリガーのスウォッチ表示に使う
  const currentOption = THEME_OPTIONS.find(option => option.mode === themeMode) ?? THEME_OPTIONS[0]

  return {
    options: THEME_OPTIONS,
    currentOption,
    isOpen,
    toggleOpen,
    handleSelect,
  }
}
