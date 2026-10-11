import { gridCellKey } from './seat-grid'
import type { SeatDraftState } from '../hooks/use-seat-draft-state'
import type { SeatGrid } from '../type'
import type { GridCell, SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import type { Seat } from '@/types'

// grid.cells の1セルにある座席idを実座席へ解決する。削除差分は空扱い、追加席は addedSeats
// から、既存席は teamSeats から引く。割当上書きは resolveEffectiveEmployeeId(唯一の解決口)を通す
const resolveCellSeat = (
  seatId: string,
  teamSeats: Seat[],
  addedSeats: Seat[],
  removedSeatIds: Set<string>,
  resolveEffectiveEmployeeId: SeatDraftState['resolveEffectiveEmployeeId'],
  rotationOverrides: SeatDraftState['rotationOverrides']
): Seat | null => {
  if (removedSeatIds.has(seatId)) return null
  const base = addedSeats.find(s => s.id === seatId) ?? teamSeats.find(s => s.id === seatId)
  if (!base) return null
  // STEP D1: 回転の差分はrotationOverridesにしか載らない。下書き追加席はrotateSeatがaddedSeats
  // 自身を直接書き換えるためbaseが既に最新で、上書きが無ければbase.rotationをそのまま使う
  const rotation = rotationOverrides.get(seatId) ?? base.rotation
  return { ...base, employeeId: resolveEffectiveEmployeeId(seatId, base.employeeId), rotation }
}

// grid.cells を行列としてそのまま使い、差分を反映した SeatGrid を組み立てる。
// 空セルは emptyCells に積む(描画は次 STEP の担当)
export const buildEditingSeatGrid = (
  grid: SeatGridDraft,
  teamSeats: Seat[],
  addedSeats: Seat[],
  removedSeatIds: Set<string>,
  resolveEffectiveEmployeeId: SeatDraftState['resolveEffectiveEmployeeId'],
  rotationOverrides: SeatDraftState['rotationOverrides']
): SeatGrid => {
  const positionedSeats: SeatGrid['positionedSeats'] = []
  const seatByGridCell = new Map<string, Seat>()
  const emptyCells: GridCell[] = []

  for (let row = 0; row < grid.cells.length; row += 1) {
    for (let col = 0; col < grid.cells[row].length; col += 1) {
      const seatId = grid.cells[row][col]
      const seat = seatId
        ? resolveCellSeat(
            seatId,
            teamSeats,
            addedSeats,
            removedSeatIds,
            resolveEffectiveEmployeeId,
            rotationOverrides
          )
        : null
      if (!seat) {
        emptyCells.push({ row, col })
        continue
      }
      positionedSeats.push({ seat, row, col })
      seatByGridCell.set(gridCellKey(row, col), seat)
    }
  }

  return {
    positionedSeats,
    seatByGridCell,
    rows: grid.cells.length,
    cols: grid.cells[0]?.length ?? 0,
    emptyCells,
  }
}
