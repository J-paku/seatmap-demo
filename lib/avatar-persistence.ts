// アバター上書きの localStorage 永続化。ownerCode をキーにして本人以外も保存できる
import type { PixelAvatarConfig, StoredAvatarRecord } from '@/types'

// 旧スキーマ(kind を持たない AvatarConfig)が同じキーに残っていると型ガードで弾くだけになるため、
// 接頭辞ごと変えて旧値を参照しない。docs/pitfalls.md「無効化手段のないクライアントキャッシュ」対策
const AVATAR_KEY_PREFIX = 'seatmap-demo:avatar-v2:'

const keyOf = (ownerCode: string): string => `${AVATAR_KEY_PREFIX}${ownerCode}`

// PixelAvatarConfig の緩い型ガード(localStorage 由来値の検証用)
const isPixelAvatarConfig = (value: unknown): value is PixelAvatarConfig => {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.kind === 'preset') return typeof v.id === 'string'
  if (v.kind === 'pixels') return v.size === 16 && Array.isArray(v.rows) && typeof v.palette === 'object'
  if (v.kind !== 'parts') return false
  if (typeof v.hair !== 'string' || typeof v.face !== 'string' || typeof v.outfit !== 'string') return false
  const p = v.palette
  if (p === null || typeof p !== 'object') return false
  const pal = p as Record<string, unknown>
  return typeof pal.hair === 'string' && typeof pal.skin === 'string' && typeof pal.outfit === 'string'
}

const isStoredAvatarRecord = (value: unknown): value is StoredAvatarRecord => {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.ownerCode === 'string' &&
    typeof v.ownerName === 'string' &&
    typeof v.updatedTime === 'string' &&
    isPixelAvatarConfig(v.config)
  )
}

// 1件読み込む。パース失敗・型不一致は null(呼び出し側はモックのシードへフォールバック)
export const loadStoredAvatar = (ownerCode: string): StoredAvatarRecord | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyOf(ownerCode))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredAvatarRecord(parsed) ? parsed : null
  } catch {
    // 破損値・ストレージアクセス不可はシードへフォールバック
    return null
  }
}

// 保存済みの上書きを全件読み込む(キー接頭辞で走査)
export const loadStoredAvatars = (): StoredAvatarRecord[] => {
  if (typeof window === 'undefined') return []
  const records: StoredAvatarRecord[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(AVATAR_KEY_PREFIX)) continue
      const record = loadStoredAvatar(key.slice(AVATAR_KEY_PREFIX.length))
      if (record) records.push(record)
    }
  } catch {
    // 走査中の例外は「上書きなし」として扱う
    return records
  }
  return records
}

// 保存する(プライベートモード等の書き込み失敗は呼び出し側で state のみ反映)
export const saveStoredAvatar = (record: StoredAvatarRecord): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyOf(record.ownerCode), JSON.stringify(record))
  } catch {
    // localStorage 不可環境では保存をスキップ
  }
}
