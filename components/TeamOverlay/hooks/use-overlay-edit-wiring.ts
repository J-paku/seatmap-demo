import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { useBulkAssign } from './use-bulk-assign'
import type { UseBulkAssignResult } from './use-bulk-assign'
import { useDraftAppliedSeats } from './use-draft-applied-seats'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { useSeatCommit } from './use-seat-commit'
import type { UseSeatCommitResult } from './use-seat-commit'
import type { UseSeatSelectionResult } from './use-seat-selection'
import type { SeatGrid, TeamOverlayPayload } from '../type'
import type { GridCell } from '@/utils/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/seat-relayout'
import type { Employee, Seat } from '@/types'

// TeamOverlayの編集配線をまとめて持つ。選択のトグル・席追加とその直後のハイライト・
// 配属シートの開閉・一括配置・保存/取消・編集中の閉じる拒否は、どれも「編集セッション1つ」に
// 属する配線なので1本にまとめる(index.tsxは組み立てだけを残す)

// STEP B5: 追加直後の席をハイライト(選択状態を流用)しておく時間。この間に別のセル/席を
// 選択し直した場合はハイライトを奪わない(下のuseEffectがisSeatSelectedの変化で再評価する)
const SEAT_ADD_HIGHLIGHT_MS = 1800

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

export type UseOverlayEditWiringResult = {
  handleSelectSeat: (seatId: string) => void
  handleSelectEmptyCell: (cell: GridCell) => void
  handleAddSeat: (cell: GridCell) => void
  assignSeatId: string | null
  assignTargetSeat: Seat | null
  assignEmployees: Employee[]
  draftAppliedSeats: Seat[]
  handleAssignSeat: (seatId: string) => void
  handleAssignSelect: (employeeId: string) => void
  handleAssignClear: () => void
  handleAssignClose: () => void
  bulkAssign: UseBulkAssignResult
  handleBulkAssignRequest: () => void
  seatCommit: UseSeatCommitResult
  handleSaveEdit: () => void
  handleCancelEdit: () => void
  // 編集中は閉じないガード付きの閉じる口。✕・背景・Esc・下スワイプの全経路がこれを通る
  guardedClose: () => void
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
  const { selectSeat, selectEmptyCell, isSeatSelected, isEmptyCellSelected, clearSelection } = seatSelection

  // STEP B5: 空セルの再タップで選択解除できるようにする。selectEmptyCell自体は「常にそのセルを
  // 選ぶ」だけでトグルではないため、既に選択中のセルを再度渡された時だけここでclearSelectionへ
  // 差し替える(SeatActionOverlayのコンテナがpointer-events:noneで背後のEmptyGridCellへタップを
  // 素通しする設計と対になる箇所)
  const handleSelectEmptyCell = useCallback(
    (cell: GridCell) => {
      if (isEmptyCellSelected(cell)) {
        clearSelection()
        return
      }
      selectEmptyCell(cell)
    },
    [isEmptyCellSelected, clearSelection, selectEmptyCell]
  )

  // STEP C1: 席の再タップで選択解除できるようにする。selectSeat自体は「常にその席を選ぶ」だけで
  // トグルではないため、空セル側(handleSelectEmptyCell)と同じ方針でここに差し替える
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

  // STEP C2: 社員検索シートはキャンバス編集(SeatMapView)と同じ EmployeeAssignSheet をそのまま使う。
  // 確定先だけこちらは assignmentsOverride(draft.assignEmployee)へ差し替え、localStorage への保存は
  // 一切行わない(保存は EditDock の保存ボタン → seatCommit.commit のみが担う。STEP D3)
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null)

  // 対象席は seatGrid(差分反映済み)から引く。判定基準を二重に持たないため、下書き追加席・
  // 割当上書きの解決は use-seat-layout-compose 側の1本にそのまま委ねる
  const assignTargetSeat = useMemo(
    () => seatGrid.positionedSeats.find((p) => p.seat.id === assignSeatId)?.seat ?? null,
    [seatGrid, assignSeatId]
  )

  // 検索対象は組織全員。employeeById は SeatMapView から渡ってくる同じ Map をそのまま使う
  const assignEmployees = useMemo(() => [...employeeById.values()], [employeeById])

  // STEP C4: 検索シート・一括配置へ渡す「全座席」は下書き反映済みのものに統一する。base(seats)の
  // ままだと同一セッション内の配属がシートから見えず、「今どこに座っているか」の判定が保存済みの
  // 席を指し続けて同じ人を複数席へ重複配置できてしまう。判定基準を二重に持たないよう、
  // 一括配置(useBulkAssign)側にも同じ配列を渡す
  const draftAppliedSeats = useDraftAppliedSeats(seats, editMode.draft)

  const handleAssignSeat = useCallback((seatId: string) => setAssignSeatId(seatId), [])

  const handleAssignSelect = useCallback(
    (employeeId: string) => {
      if (assignSeatId) editMode.draft.assignEmployee(assignSeatId, employeeId)
      setAssignSeatId(null)
    },
    [assignSeatId, editMode]
  )

  const handleAssignClear = useCallback(() => {
    if (assignSeatId) editMode.draft.assignEmployee(assignSeatId, null)
    setAssignSeatId(null)
  }, [assignSeatId, editMode])

  const handleAssignClose = useCallback(() => setAssignSeatId(null), [])

  // STEP C3: 部署ごとの一括配置。EmployeeAssignSheetの「この部署をまとめて配属」から呼ぶ。
  // 対象は draftAppliedSeats(下書き反映済みの全座席)から引くため、選択中の特定席とは独立に
  // 部署全員を空セルへ詰めていく
  const bulkAssign = useBulkAssign({
    teamId: payload?.teamId ?? null,
    employees: assignEmployees,
    seats: draftAppliedSeats,
    grid: editMode.grid,
    draft: editMode.draft,
    addRow: editMode.addRow,
    placeSeat: editMode.placeSeat,
    announce,
  })

  // シートを閉じてから一括配置を要求する。移動確認が要れば ConfirmDialog 側で続きを引き継ぐ
  const handleBulkAssignRequest = useCallback(() => {
    setAssignSeatId(null)
    bulkAssign.requestBulkAssign()
  }, [bulkAssign])

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

  // STEP A5→D3: 保存(commit)の呼び口。呼び出すのは編集ドック(EditDock)の保存ボタンだけにする
  const seatCommit = useSeatCommit({
    teamId: payload?.teamId ?? null,
    grid: editMode.grid,
    draft: editMode.draft,
    isGridChanged: editMode.isGridChanged,
  })

  // STEP D3: 保存経路はこの1本だけにする(ヘッダー「終了」はもうcommitを兼ねない)。
  // 保存後はeditMode.cancelで編集モードを抜ける — 抜けずに居続けると、既に確定済みの
  // draft.addedSeats/gridがそのまま残り、再度保存を押した時に同じ席を二重追加してしまうため。
  // isSaving中の二重押下はここで弾く
  const handleSaveEdit = useCallback(() => {
    if (seatCommit.isSaving) return
    void seatCommit.commit().then(() => {
      editMode.cancel()
      announce('[success]座席配置を保存しました')
    })
  }, [seatCommit, editMode, announce])

  // 取消(破棄)。ドックのキャンセルボタンとヘッダーの「終了」ボタンの両方から呼ぶ唯一の経路。
  // editMode.cancelは既に確定保存された内容までは打ち消さない(grid/draft/isEditModeの後始末のみ)ため、
  // 確認は挟まない
  const handleCancelEdit = useCallback(() => {
    editMode.cancel()
    announce('[info]編集をキャンセルしました')
  }, [editMode, announce])

  // 編集中は✕・背景・Escで閉じられないようにする(未保存の変更を無言で捨てない)。
  // 編集モードを抜けられるのは SeatLayoutHeader の「終了」と EditDock のキャンセル・保存
  // (いずれも editMode.cancel を最終的に通す)だけにする。STEP D3
  const guardedClose = useCallback(() => {
    if (editMode.isEditMode) return
    onClose()
  }, [editMode.isEditMode, onClose])

  return {
    handleSelectSeat,
    handleSelectEmptyCell,
    handleAddSeat,
    assignSeatId,
    assignTargetSeat,
    assignEmployees,
    draftAppliedSeats,
    handleAssignSeat,
    handleAssignSelect,
    handleAssignClear,
    handleAssignClose,
    bulkAssign,
    handleBulkAssignRequest,
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    guardedClose,
  }
}
