// STEP1: 複数レイアウト対応 — 新規レイアウトのid採番と空レイアウトの雛形生成
import type { LayoutMeta, SeatLayout } from '@/types'
import { VIEWBOX_H, VIEWBOX_W } from '@/utils/layout/geometry'

// crypto.randomUUID が使えない環境向けの連番フォールバック形式('layout-<連番>')
const FALLBACK_ID_PREFIX = 'layout-'
const FALLBACK_ID_PATTERN = /^layout-(\d+)$/

// フォールバック形式のidから連番を取り出す。形式外なら0(連番採番の対象外)
const extractFallbackSerial = (layoutId: string): number => {
  const matched = layoutId.match(FALLBACK_ID_PATTERN)
  return matched ? Number(matched[1]) : 0
}

// 新規レイアウトのidを採番する。crypto.randomUUID があればそれを使い、
// 無ければ既存メタの最大連番+1で採番する(Math.random は保存物のidが
// 再現不能になるため使わない)
export const createLayoutId = (existing: LayoutMeta[]): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const maxSerial = existing.reduce(
    (max, meta) => Math.max(max, extractFallbackSerial(meta.layoutId)),
    0
  )
  return `${FALLBACK_ID_PREFIX}${maxSerial + 1}`
}

// 新規レイアウトの空の雛形を作る。座席・チーム・会議室・家具は全て空で始まる
export const createEmptyLayout = (layoutId: string, name: string): SeatLayout => ({
  floorId: layoutId,
  floorName: name,
  viewBox: { width: VIEWBOX_W, height: VIEWBOX_H },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
})
