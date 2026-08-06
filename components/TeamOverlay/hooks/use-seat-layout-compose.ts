import { useMemo } from 'react'
import { buildSeatGrid, gridCellKey } from '../utils/seat-grid'
import type { SeatDraftState } from './use-seat-draft-state'
import type { SeatGrid } from '../type'
import type { GridCell, SeatGridDraft } from '@/utils/seat-grid-draft'
import type { Seat } from '@/types'

// STEP A4: 表示用グリッドの組み立て。非編集時は座標クラスタリング(buildSeatGrid)、
// 編集中は grid.cells をそのまま行列として使い、差分3種(割当上書き・追加席・削除)を
// 反映した席配列を作る。CompactSeatGrid・DesktopSeatGrid はどちらの経路で作られたグリッド
// かを知らずに済む(知らせると両グリッドに分岐が増え続ける)

export type UseSeatLayoutComposeParams = {
  teamSeats: Seat[]
  isEditMode: boolean
  grid: SeatGridDraft | null
  draft: SeatDraftState
}

// grid.cells の1セルにある座席idを実座席へ解決する。削除差分は空扱い、追加席は addedSeats
// から、既存席は teamSeats から引く。割当上書きは resolveEffectiveEmployeeId(唯一の解決口)を通す
const resolveCellSeat = (
  seatId: string,
  teamSeats: Seat[],
  addedSeats: Seat[],
  removedSeatIds: Set<string>,
  resolveEffectiveEmployeeId: SeatDraftState['resolveEffectiveEmployeeId']
): Seat | null => {
  if (removedSeatIds.has(seatId)) return null
  const base = addedSeats.find((s) => s.id === seatId) ?? teamSeats.find((s) => s.id === seatId)
  if (!base) return null
  return { ...base, employeeId: resolveEffectiveEmployeeId(seatId, base.employeeId) }
}

// grid.cells を行列としてそのまま使い、差分を反映した SeatGrid を組み立てる。
// 空セルは emptyCells に積む(描画は次 STEP の担当)
const buildEditingSeatGrid = (
  grid: SeatGridDraft,
  teamSeats: Seat[],
  addedSeats: Seat[],
  removedSeatIds: Set<string>,
  resolveEffectiveEmployeeId: SeatDraftState['resolveEffectiveEmployeeId']
): SeatGrid => {
  const positionedSeats: SeatGrid['positionedSeats'] = []
  const seatByGridCell = new Map<string, Seat>()
  const emptyCells: GridCell[] = []

  for (let row = 0; row < grid.cells.length; row += 1) {
    for (let col = 0; col < grid.cells[row].length; col += 1) {
      const seatId = grid.cells[row][col]
      const seat = seatId
        ? resolveCellSeat(seatId, teamSeats, addedSeats, removedSeatIds, resolveEffectiveEmployeeId)
        : null
      if (!seat) {
        emptyCells.push({ row, col })
        continue
      }
      positionedSeats.push({ seat, row, col })
      seatByGridCell.set(gridCellKey(row, col), seat)
    }
  }

  return { positionedSeats, seatByGridCell, rows: grid.cells.length, cols: grid.cells[0]?.length ?? 0, emptyCells }
}

export const useSeatLayoutCompose = ({ teamSeats, isEditMode, grid, draft }: UseSeatLayoutComposeParams): SeatGrid => {
  const { addedSeats, removedSeatIds, resolveEffectiveEmployeeId } = draft

  // grid と差分3種が変わった時だけ組み立て直す。draft オブジェクト自体は呼び出し側で
  // 毎レンダー新規生成されるため依存に入れない(入れると下流の Map/配列が毎回作り直しになる)
  return useMemo(() => {
    if (isEditMode && grid) return buildEditingSeatGrid(grid, teamSeats, addedSeats, removedSeatIds, resolveEffectiveEmployeeId)
    return { ...buildSeatGrid(teamSeats), emptyCells: [] }
  }, [isEditMode, grid, teamSeats, addedSeats, removedSeatIds, resolveEffectiveEmployeeId])
}
