import type { GridCell, SeatGridDraft } from '@/utils/layout/seat-grid-draft'

// useOverlayEditMode(座席編集モードの出入口)が使う、編集開始時のグリッドとの比べ方

// 2つのグリッドが同じ内容か。行・列の本数と各セルの中身(席id/空)が全て一致すれば同じとみなす。
// 保存要否の判定にしか使わないためこのフックの内部に閉じる
export const isSameSeatGridDraft = (a: SeatGridDraft, b: SeatGridDraft): boolean => {
  if (a.originX !== b.originX || a.originY !== b.originY) return false
  if (a.colPitch !== b.colPitch || a.rowPitch !== b.rowPitch) return false
  if (a.cells.length !== b.cells.length) return false
  return a.cells.every((row, r) => {
    const other = b.cells[r]
    return row.length === other.length && row.every((cell, c) => cell === other[c])
  })
}

// baselineGrid内で指定seatIdが今どのセルにあるかを探す。無ければnull(下書き追加席など、
// baseline時点でまだ存在しなかった席)
const findSeatCell = (draft: SeatGridDraft, seatId: string): GridCell | null => {
  for (let r = 0; r < draft.cells.length; r += 1) {
    const c = draft.cells[r].indexOf(seatId)
    if (c !== -1) return { row: r, col: c }
  }
  return null
}

// §06-3: baselineから絶対座標(origin + セル位置×ピッチ)が動いた既存席のid集合を求める。
// row/col の生インデックスだけでは比較できない — addRow('top')/addCol('left') は既存席の
// 絶対座標を保つためoriginを補正しつつ全セルのインデックスをずらす(seat-grid-draft.ts参照)。
// 生インデックス比較だとこの補正込みの「動いていない」席まで全部「動いた」と誤判定してしまう。
// 下書き追加席(addedSeatIds)はbaselineに存在せず、件数はaddedSeats.length側で既に計上済みのため除外する
export const computeMovedSeatIds = (
  grid: SeatGridDraft,
  baselineGrid: SeatGridDraft,
  addedSeatIds: Set<string>
): Set<string> => {
  const moved = new Set<string>()
  for (let row = 0; row < grid.cells.length; row += 1) {
    for (const [col, seatId] of grid.cells[row].entries()) {
      if (seatId === null || addedSeatIds.has(seatId)) continue
      const basePos = findSeatCell(baselineGrid, seatId)
      if (basePos === null) continue
      const currentX = grid.originX + col * grid.colPitch
      const currentY = grid.originY + row * grid.rowPitch
      const baseX = baselineGrid.originX + basePos.col * baselineGrid.colPitch
      const baseY = baselineGrid.originY + basePos.row * baselineGrid.rowPitch
      if (currentX !== baseX || currentY !== baseY) moved.add(seatId)
    }
  }
  return moved
}
