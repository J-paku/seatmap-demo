import { isThemeMode, migrateLegacyTheme } from '@/utils/theme'
import type { ThemeMode } from '@/types'

const THEME_STORAGE_KEY = 'seatmap-demo:theme'

export const readStoredTheme = (): ThemeMode | null => {
  try {
    const migrated = migrateLegacyTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
    return isThemeMode(migrated) ? migrated : null
  } catch {
    // 破損値・ストレージアクセス不可・SSR(window が無い)は既定テーマへ
    return null
  }
}

export const writeStoredTheme = (mode: ThemeMode): void => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // localStorage 不可環境では state のみ反映
  }
}
