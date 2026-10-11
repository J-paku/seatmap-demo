import type { StoredAvatarRecord } from '@/types'

// 同じ ownerCode は後勝ち(上書きがシードに優先する)
export const mergeByOwnerCode = (
  base: StoredAvatarRecord[],
  overrides: StoredAvatarRecord[]
): StoredAvatarRecord[] => {
  const map = new Map(base.map(r => [r.ownerCode, r]))
  for (const record of overrides) map.set(record.ownerCode, record)
  return [...map.values()]
}
