// 08: 本人アバターのlocalStorage永続化(self-avatar-contextから分離)
import type { AvatarConfig } from '@/types'

// 本人(emp-001)アバター保存キー
export const AVATAR_STORAGE_KEY = 'seatmap-demo:avatar:emp-001'

// AvatarConfigの緩い型ガード(localStorage由来値の検証用)
export const isAvatarConfig = (value: unknown): value is AvatarConfig => {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.hair !== 'string' || typeof v.face !== 'string' || typeof v.outfit !== 'string') return false
  const p = v.palette
  if (p === null || typeof p !== 'object') return false
  const pal = p as Record<string, unknown>
  return typeof pal.hair === 'string' && typeof pal.skin === 'string' && typeof pal.outfit === 'string'
}

// 保存済みアバターを読み込む。パース失敗/型不一致時はnullを返す(呼び出し側はシードにフォールバック)
export const loadStoredAvatar = (): AvatarConfig | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAvatarConfig(parsed) ? parsed : null
  } catch {
    // 破損値/ストレージアクセス不可はシードへフォールバック
    return null
  }
}

// アバター設定を保存する(プライベートモード等の書き込み失敗は呼び出し側でstateのみ反映)
export const saveStoredAvatar = (config: AvatarConfig): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage不可環境では保存をスキップ
  }
}
