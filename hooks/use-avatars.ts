// 実物 useAvatarsSWR(IndexedDB + SWR)のデモ代替。データ源は mocks/avatars.json + localStorage 上書き。
// 公開インターフェース(avatars / isInitialLoading / refreshAvatarFor / upsertLocalAvatar)は原文と同じに保つ
import { useCallback, useEffect, useState } from 'react'
import type { StoredAvatarRecord } from '@/types'
import { seedAvatarRecords } from '@/lib/mock-loader'
import { loadStoredAvatar, loadStoredAvatars, saveStoredAvatar } from '@/lib/avatar-persistence'

interface UseAvatarsResult {
  avatars: StoredAvatarRecord[]
  isInitialLoading: boolean
  refreshAvatarFor: (ownerCode: string) => Promise<void>
  upsertLocalAvatar: (record: StoredAvatarRecord) => Promise<void>
}

// 同じ ownerCode は後勝ち(上書きがシードに優先する)
const mergeByOwnerCode = (
  base: StoredAvatarRecord[],
  overrides: StoredAvatarRecord[]
): StoredAvatarRecord[] => {
  const map = new Map(base.map((r) => [r.ownerCode, r]))
  for (const record of overrides) map.set(record.ownerCode, record)
  return [...map.values()]
}

export function useAvatars(): UseAvatarsResult {
  // 初回レンダーはシードのみ。localStorage はクライアント専用なので effect で合流させる
  // (サーバー出力と初回クライアント出力を一致させ、hydration 不整合を避ける)
  const [avatars, setAvatars] = useState<StoredAvatarRecord[]>(seedAvatarRecords)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    // localStorage 合流は hydration 一致のためマウント後にしか行えない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatars(mergeByOwnerCode(seedAvatarRecords(), loadStoredAvatars()))
    setIsInitialLoading(false)
  }, [])

  // デモにサーバーは無いので、該当 ownerCode の上書きを読み直すだけ
  const refreshAvatarFor = useCallback(async (ownerCode: string): Promise<void> => {
    const record = loadStoredAvatar(ownerCode)
    if (!record) return
    setAvatars((prev) => mergeByOwnerCode(prev, [record]))
  }, [])

  const upsertLocalAvatar = useCallback(async (record: StoredAvatarRecord): Promise<void> => {
    saveStoredAvatar(record)
    setAvatars((prev) => mergeByOwnerCode(prev, [record]))
  }, [])

  return { avatars, isInitialLoading, refreshAvatarFor, upsertLocalAvatar }
}
