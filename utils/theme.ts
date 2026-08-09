// テーマの既定値・localStorage 検証・UI メタ(ランタイム値)を持つ。ThemeMode 型自体は types/index.ts に残す
import type { ThemeMode } from '@/types'

// メインのダークテーマ — OS ダーク追従・旧 'dark' 移行の落とし先
const DEFAULT_DARK_THEME: ThemeMode = 'dracula'

// localStorage 復元時の検証に使う全テーマ値
const THEME_MODES: readonly ThemeMode[] = ['light', 'dracula', 'kuroxxx']

// 暗い系テーマ判定 — Tailwind dark バリアント付与・暗色トーン適用の基準
export const isDarkTheme = (mode: ThemeMode): boolean => mode !== 'light'

// 旧 'dark' テーマの保存値を dracula へ移行する — 廃止テーマの後方互換
export const migrateLegacyTheme = (value: string | null): string | null =>
  value === 'dark' ? DEFAULT_DARK_THEME : value

// localStorage に保存された文字列が有効な ThemeMode か検証する型ガード
export const isThemeMode = (value: string | null): value is ThemeMode =>
  value !== null && (THEME_MODES as readonly string[]).includes(value)

// テーマ選択 UI 用メタ — ラベルと2色スウォッチ(背景 + アクセント)
export interface ThemeOption {
  mode: ThemeMode
  label: string
  swatchBg: string
  swatchAccent: string
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { mode: 'light', label: 'ライト', swatchBg: '#F5EFE9', swatchAccent: '#C76A4A' },
  { mode: 'dracula', label: 'ドラキュラ', swatchBg: '#282A36', swatchAccent: '#BD93F9' },
  { mode: 'kuroxxx', label: 'クロミ', swatchBg: '#1A1320', swatchAccent: '#F58FB8' },
]
