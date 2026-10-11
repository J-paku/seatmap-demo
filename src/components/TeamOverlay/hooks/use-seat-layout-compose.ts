import { useMemo } from 'react'
import { buildSeatGrid } from '../utils/seat-grid'
import { buildEditingSeatGrid } from '../utils/build-editing-grid'
import type { SeatDraftState } from './use-seat-draft-state'
import type { SeatGrid } from '../type'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
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

export const useSeatLayoutCompose = ({
  teamSeats,
  isEditMode,
  grid,
  draft,
}: UseSeatLayoutComposeParams): SeatGrid => {
  const { addedSeats, removedSeatIds, resolveEffectiveEmployeeId, rotationOverrides } = draft

  // grid と差分4種が変わった時だけ組み立て直す。draft オブジェクト自体は呼び出し側で
  // 毎レンダー新規生成されるため依存に入れない(入れると下流の Map/配列が毎回作り直しになる)
  return useMemo(() => {
    if (isEditMode && grid) {
      return buildEditingSeatGrid(
        grid,
        teamSeats,
        addedSeats,
        removedSeatIds,
        resolveEffectiveEmployeeId,
        rotationOverrides
      )
    }
    return { ...buildSeatGrid(teamSeats), emptyCells: [] }
  }, [
    isEditMode,
    grid,
    teamSeats,
    addedSeats,
    removedSeatIds,
    resolveEffectiveEmployeeId,
    rotationOverrides,
  ])
}
