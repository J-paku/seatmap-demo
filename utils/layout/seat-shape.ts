// §00-3 座席形状の既定サイズ適用。副作用のない純粋計算だけを持ち、
// 発行側(utils/layout/layout-actions.ts の seat-reshape)から呼ばれる。
// 形状の判定基準をここ1箇所に閉じ込め、コンポーネント側では持たない
import { clamp } from './geometry'
import type { Seat } from '@/types'

// §00-3: standard 105×75 / executive 110×90 / vertical 75×105
const SEAT_SHAPE_DEFAULT_SIZE: Record<NonNullable<Seat['shape']>, { width: number; height: number }> = {
  standard: { width: 105, height: 75 },
  executive: { width: 110, height: 90 },
  vertical: { width: 75, height: 105 },
}

// §00-3 のクランプ幅。既定サイズは全て範囲内だが、上限・下限の所在をここ1箇所にする
const SEAT_SIZE_MIN = 50
const SEAT_SIZE_MAX = 200

// 回転90/270は中心基準で w/h を交換する(§00-3)。0/180 は左上基準のまま
const isQuarterTurned = (rotation: Seat['rotation']): boolean => rotation === 90 || rotation === 270

// 形状を当てた座席。変化が無ければ同じ参照を返す — 呼び出し側はこれで
// 「無変化なら undo を積まない」を判定する
export const applySeatShape = (seat: Seat, shape: NonNullable<Seat['shape']>): Seat => {
  // 利用者が手で広げた席はサイズを戻さない(§00-3 isSizeOverridden)。形状の記録だけ更新する
  if (seat.isSizeOverridden) return seat.shape === shape ? seat : { ...seat, shape }

  const base = SEAT_SHAPE_DEFAULT_SIZE[shape]
  const baseW = clamp(base.width, SEAT_SIZE_MIN, SEAT_SIZE_MAX)
  const baseH = clamp(base.height, SEAT_SIZE_MIN, SEAT_SIZE_MAX)
  const turned = isQuarterTurned(seat.rotation)
  const width = turned ? baseH : baseW
  const height = turned ? baseW : baseH
  // 交換後の箱は、交換前の箱(左上=現在位置・大きさ baseW×baseH)と中心を共有する
  const x = seat.x + (baseW - width) / 2
  const y = seat.y + (baseH - height) / 2

  if (seat.shape === shape && seat.width === width && seat.height === height) return seat
  return { ...seat, shape, x, y, width, height }
}
