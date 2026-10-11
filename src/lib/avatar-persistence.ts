// アバター上書きの localStorage 永続化。ownerCode をキーにして本人以外も保存できる
import type { PixelAvatarConfig, StoredAvatarRecord } from '@/types'

// 旧スキーマ(kind を持たない AvatarConfig)が同じキーに残っていると型ガードで弾くだけになるため、
// 接頭辞ごと変えて旧値を参照しない。docs/pitfalls.md「無効化手段のないクライアントキャッシュ」対策
const AVATAR_KEY_PREFIX = 'seatmap-demo:avatar-v2:'

const keyOf = (ownerCode: string): string => `${AVATAR_KEY_PREFIX}${ownerCode}`

// PixelAvatarConfig の緩い型ガード(localStorage 由来値の検証用)。
// 形の検査は readRecord の try の中だけで使う。null・undefined は属性の参照で例外になり、
// その catch が null に丸める。数や文字列は属性が undefined になるので偽を返す
const isPixelAvatarConfig = (value: unknown): value is PixelAvatarConfig => {
  const v = value as Record<string, unknown>
  if (v.kind === 'preset') return typeof v.id === 'string'
  if (v.kind === 'pixels')
    return v.size === 16 && Array.isArray(v.rows) && typeof v.palette === 'object'
  if (v.kind !== 'parts') return false
  if (typeof v.hair !== 'string' || typeof v.face !== 'string' || typeof v.outfit !== 'string')
    return false
  const pal = v.palette as Record<string, unknown>
  return (
    typeof pal.hair === 'string' && typeof pal.skin === 'string' && typeof pal.outfit === 'string'
  )
}

// isPixelAvatarConfig と同じく readRecord の try の中だけで使う
const isStoredAvatarRecord = (value: unknown): value is StoredAvatarRecord => {
  const v = value as Record<string, unknown>
  return (
    typeof v.ownerCode === 'string' &&
    typeof v.ownerName === 'string' &&
    typeof v.updatedTime === 'string' &&
    isPixelAvatarConfig(v.config)
  )
}

// キー1つを読む。パース失敗・型不一致は null(呼び出し側はモックのシードへフォールバック)。
// SSR(window が無い)・ストレージアクセス不可は参照の時点で例外になり、catch が null に丸める。
// 未保存(getItem が null)は文字列 'null' になり、JSON の null として読んでから形の検査で弾く
const readRecord = (key: string): StoredAvatarRecord | null => {
  try {
    const parsed: unknown = JSON.parse(String(window.localStorage.getItem(key)))
    return isStoredAvatarRecord(parsed) ? parsed : null
  } catch {
    // 破損値・ストレージアクセス不可はシードへフォールバック
    return null
  }
}

// 1件読み込む
export const loadStoredAvatar = (ownerCode: string): StoredAvatarRecord | null =>
  readRecord(keyOf(ownerCode))

// 保存済みの上書きを全件読み込む(キー接頭辞で走査)。値は見つけたキーでそのまま読む
export const loadStoredAvatars = (): StoredAvatarRecord[] => {
  const records: StoredAvatarRecord[] = []
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(AVATAR_KEY_PREFIX)) continue
      const record = readRecord(key)
      if (record) records.push(record)
    }
  } catch {
    // 走査中の例外(SSR・ストレージアクセス不可)は「上書きなし」として扱う
  }
  return records
}

// 保存する(プライベートモード等の書き込み失敗は呼び出し側で state のみ反映)
export const saveStoredAvatar = (record: StoredAvatarRecord): void => {
  try {
    window.localStorage.setItem(keyOf(record.ownerCode), JSON.stringify(record))
  } catch {
    // localStorage 不可環境(SSR を含む)では保存をスキップ
  }
}
