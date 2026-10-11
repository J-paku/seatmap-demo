import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { useDraftAppliedSeats } from './use-draft-applied-seats'
import { useOverlayAssign } from './use-overlay-assign'
import type { UseOverlayAssignResult } from './use-overlay-assign'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { useOverlaySeatDelete } from './use-overlay-seat-delete'
import type { UseOverlaySeatDeleteResult } from './use-overlay-seat-delete'
import { useOverlaySessionExit } from './use-overlay-session-exit'
import type { UseOverlaySessionExitResult } from './use-overlay-session-exit'
import type { UseSeatSelectionResult } from './use-seat-selection'
import type { SeatGrid } from '../type'
import { useSeatLayout } from '@/hooks/use-mock-data'
import type { GridCell } from '@/utils/layout/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import type { Employee, Seat, TeamOverlayPayload } from '@/types'

// TeamOverlayの編集配線をまとめる入口。ここが直接持つのは「席そのものの操作」
// (選択のトグル・席追加とその直後のハイライト・フリーアドレス設定)だけで、
// 配属・座席削除・セッションの終了はそれぞれ専用のフックへ分けてある(index.tsxは組み立てだけ)

// STEP B5: 追加直後の席をハイライト(選択状態を流用)しておく時間。この間に別のセル/席を
// 選択し直した場合はハイライトを奪わない(下のuseEffectがisSeatSelectedの変化で再評価する)
const SEAT_ADD_HIGHLIGHT_MS = 1800

export type { AssignConfirmContent } from './use-overlay-assign'
export type { SeatDeleteConfirmContent } from './use-overlay-seat-delete'

export type UseOverlayEditWiringParams = {
  payload: TeamOverlayPayload | null
  seats: Seat[]
  employeeById: Map<string, Employee>
  seatGrid: SeatGrid
  editMode: UseOverlayEditModeResult
  seatSelection: UseSeatSelectionResult
  isCompactMobile: boolean
  // 追加直後の席までスクロールさせるための本文スクロール領域
  bodyRef: RefObject<HTMLDivElement | null>
  announce: (message: string) => void
  onClose: () => void
}

export type UseOverlayEditWiringResult = UseOverlayAssignResult &
  UseOverlaySeatDeleteResult &
  UseOverlaySessionExitResult & {
    handleSelectSeat: (seatId: string) => void
    handleAddSeat: (cell: GridCell) => void
    // 下書き反映済みの全座席。シート・一括配置・削除確認が同じ配列を見る
    draftAppliedSeats: Seat[]
    // §06-2 座席モード: フリーアドレス設定の現在値(保存値に編集中の差分を重ねたもの)と切り替え口
    freeAddressEnabled: boolean
    toggleFreeAddress: () => void
  }

export const useOverlayEditWiring = ({
  payload,
  seats,
  employeeById,
  seatGrid,
  editMode,
  seatSelection,
  isCompactMobile,
  bodyRef,
  announce,
  onClose,
}: UseOverlayEditWiringParams): UseOverlayEditWiringResult => {
  // STEP B5: 空セルからの席追加。仮IDの採番はuseSeatDraftState.addSeatに一本化し、ここでは
  // 採番しない。置いた直後は選択状態(既存のis-selected見せ方)をハイライト代わりに流用する
  const [justAddedSeatId, setJustAddedSeatId] = useState<string | null>(null)

  // useEffect/useCallbackの依存配列にメンバー式(seatSelection.xxx)をそのまま書くとlintが
  // 親オブジェクト自体の追跡を求めてくるため、使う関数だけ先に取り出しておく
  const { selectSeat, isSeatSelected, clearSelection } = seatSelection

  // STEP C1: 席の再タップで選択解除できるようにする。selectSeat自体は「常にその席を選ぶ」だけで
  // トグルではないため、ここでclearSelectionへ差し替える
  const handleSelectSeat = useCallback(
    (seatId: string) => {
      if (isSeatSelected(seatId)) {
        clearSelection()
        return
      }
      selectSeat(seatId)
    },
    [isSeatSelected, clearSelection, selectSeat]
  )

  // STEP C4: 検索シート・一括配置・削除確認へ渡す「全座席」は下書き反映済みのものに統一する。
  // base(seats)のままだと同一セッション内の配属がシートから見えず、「今どこに座っているか」の
  // 判定が保存済みの席を指し続けて同じ人を複数席へ重複配置できてしまう
  const draftAppliedSeats = useDraftAppliedSeats(seats, editMode.draft)

  // §07-4 の「場所表記はチーム名」を満たすためのチームid→名前。保存済みレイアウトの teams が
  // 唯一の名前の出所で、ここで座席IDから接頭辞を切り出すような二つ目の判定基準は作らない
  const { layout } = useSeatLayout()
  const teamNameById = useMemo(
    () => new Map((layout?.teams ?? []).map((team) => [team.id, team.name])),
    [layout]
  )

  // §06-2: フリーアドレス設定の保存値。teamNameById と同じく保存済みレイアウトの teams が
  // 唯一の出所で、既定値(false)の穴埋めは lib/layout-persistence.ts の loadStoredLayout が
  // 済ませている。ここでは読めなかった時(種データ由来でキーを持たない)だけ false へ倒す
  const savedFreeAddressEnabled = useMemo(
    () => (layout?.teams ?? []).find((team) => team.id === payload?.teamId)?.freeAddressEnabled ?? false,
    [layout, payload]
  )

  const { resolveFreeAddressEnabled, toggleFreeAddress: toggleDraftFreeAddress } = editMode.draft
  const freeAddressEnabled = resolveFreeAddressEnabled(savedFreeAddressEnabled)
  const toggleFreeAddress = useCallback(
    () => toggleDraftFreeAddress(savedFreeAddressEnabled),
    [toggleDraftFreeAddress, savedFreeAddressEnabled]
  )

  const assign = useOverlayAssign({
    payload,
    employeeById,
    seatGrid,
    editMode,
    draftAppliedSeats,
    teamNameById,
    announce,
  })

  const seatDelete = useOverlaySeatDelete({ editMode, seatGrid, draftAppliedSeats, employeeById })

  const sessionExit = useOverlaySessionExit({ payload, editMode, employeeById, announce, onClose })

  const handleAddSeat = useCallback(
    (cell: GridCell) => {
      if (!payload) return
      // x/y はグリッドセルの位置がそのまま採用され、保存(commit)時にセル位置から座標を
      // 直列化し直すため、ここでの値は使われない(0で安全)
      const newSeat = editMode.draft.addSeat({
        teamId: payload.teamId,
        x: 0,
        y: 0,
        width: DEFAULT_SEAT_WIDTH,
        height: DEFAULT_SEAT_HEIGHT,
        rotation: 0,
        employeeId: null,
      })
      editMode.placeSeat(cell, newSeat.id)
      selectSeat(newSeat.id)
      setJustAddedSeatId(newSeat.id)
    },
    [payload, editMode, selectSeat]
  )

  // 追加直後の席を一定時間だけハイライトし続け、その間に選択が変わらなければ自動で消す。
  // isSeatSelectedはselectionが変わるたびに参照が変わるため、途中で別のセル/席が選択されたら
  // このeffectが再評価されタイマーを張り直さない(他人の選択を誤って消さないための唯一の判定)
  useEffect(() => {
    if (!justAddedSeatId) return
    // 選択が追加直後の席から移ったらフラグ自体を落とす。残したままだと、後で同じ席を選び直した
    // だけでこのeffectが再起動し、追加とは無関係な選択を自動解除してしまう
    if (!isSeatSelected(justAddedSeatId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustAddedSeatId(null)
      return
    }
    if (isCompactMobile) {
      const target = bodyRef.current?.querySelector<HTMLElement>(`[data-seat-id="${justAddedSeatId}"]`)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    }
    const timer = window.setTimeout(() => {
      clearSelection()
      setJustAddedSeatId(null)
    }, SEAT_ADD_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [justAddedSeatId, isCompactMobile, isSeatSelected, clearSelection, bodyRef])

  return {
    ...assign,
    ...seatDelete,
    ...sessionExit,
    handleSelectSeat,
    handleAddSeat,
    draftAppliedSeats,
    freeAddressEnabled,
    toggleFreeAddress,
  }
}
