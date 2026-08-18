import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUndoChip } from './use-undo-chip'
import type { PressState, UndoChipRequest, UndoChipView, RecentPlacement, Viewport } from '../type'
import type { LayoutObjectRef, SeatLayout } from '@/types'

// 07: 編集モードのチーム枠・設備のタップ判定と、座席の複数選択。閲覧モードではこのロジックへ到達しない。
//
// 実体を指で直接動かす経路は持たない。移動導線はタップ → ゴースト → 配置の1本だけで、
// キャンバスは移動系の props を一切受け取らない — ドラッグ移動は「確定するまで実体は動かない」
// というゴーストの存在意義を正面から破り、置きたい場所を指が覆う問題も戻してしまう。
// 押下の追跡は残すが、それは「指が滑っただけの押下でゴーストを開かない」ためだけに使う。
//
// 座席そのものはキャンバスに描かれない(CLAUDE.md 不変ルール1・仕様 00-2)。座席位置の編集は
// チームオーバーレイのグリッド(編集4)が担い、ここが持つのは「どの座席を選んでいるか」だけ

// ドラッグとみなす最小移動量(ゴースト側の DRAG_CONFIRM_PX と同値)
const DRAG_THRESHOLD_PX = 3

type Options = {
  viewport: Viewport
  layout: SeatLayout
  isEditMode: boolean
  onSeatEditSelect?: (seatId: string | null) => void
  // 05-3: タップ(動かさずに離した押下)で移動ゴーストを開く。実体はその場に残る
  onTeamTap?: (teamId: string) => void
  onObjectTap?: (ref: LayoutObjectRef) => void
  // Escape の2段目。セッション終了=ステージング破棄(確認なし・仕様 05-3)
  onEndSession?: () => void
}

type EditDragState = {
  editSelectedSeatIds: string[]
  editSelectedObject: LayoutObjectRef | null
  undoChip: {
    view: UndoChipView | null
    message: string
    recent: RecentPlacement | null
    showAt: (request: UndoChipRequest) => void
    dismiss: () => void
  }
  selectSeat: (seatId: string, toggle: boolean) => void
  onTeamLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
  onObjectEditPointerDown: (ref: LayoutObjectRef, e: ReactPointerEvent) => void
  // 05-3: タップ判定を通した後の入口。呼ぶのは click ハンドラ側
  onTeamEditTap: (teamId: string) => void
  onObjectEditTap: (ref: LayoutObjectRef) => void
  clearSelection: () => void
}

export const useEditDrag = ({
  viewport,
  layout,
  isEditMode,
  onSeatEditSelect,
  onTeamTap,
  onObjectTap,
  onEndSession,
}: Options): EditDragState => {
  const { transformRef } = viewport
  const pressRef = useRef<PressState | null>(null)
  const undoChip = useUndoChip(transformRef)
  // ドラッグで動かした直後にブラウザが送る click を1回だけ握り潰すための目印。
  // 読み取りと消費を1関数へ閉じるのは FAB の長押し(consumeFired)と同じ理由 —
  // 呼び出し側へ ref を渡すと外から書き換える形になり React Compiler の検査に反する
  const suppressTapRef = useRef(false)

  const consumeTapSuppression = (): boolean => {
    if (!suppressTapRef.current) return false
    suppressTapRef.current = false
    return true
  }

  // 05-3: 編集セッション中に選択された座席(複数可)。フローティングアクションバーの対象
  const [editSelectedSeatIds, setEditSelectedSeatIds] = useState<string[]>([])
  // キー操作は最新の選択を同期的に読む必要があるため、state と同じ値を ref にも持つ
  const selectedSeatIdsRef = useRef<string[]>([])
  // 07/B: 選択中の会議室・家具。選択は全体で1件だけなので座席選択と相互に打ち消す
  const [editSelectedObject, setEditSelectedObject] = useState<LayoutObjectRef | null>(null)

  // 選択の更新はここ1本に通す。単独選択の入口(社員検索シート等)は先頭1件だけを見る
  const applySeatSelection = useCallback(
    (next: string[]) => {
      selectedSeatIdsRef.current = next
      setEditSelectedSeatIds(next)
      onSeatEditSelect?.(next.length === 1 ? next[0] : null)
    },
    [onSeatEditSelect]
  )

  // 05-3: Shift+クリック=トグル、通常クリック=単独選択
  const selectSeat = useCallback(
    (seatId: string, toggle: boolean) => {
      if (!isEditMode) return
      const current = selectedSeatIdsRef.current
      const next = toggle
        ? current.includes(seatId)
          ? current.filter((id) => id !== seatId)
          : [...current, seatId]
        : [seatId]
      applySeatSelection(next)
      setEditSelectedObject(null)
      undoChip.dismiss()
    },
    [isEditMode, applySeatSelection, undoChip]
  )

  const clearSelection = useCallback(() => {
    applySeatSelection([])
    setEditSelectedObject(null)
  }, [applySeatSelection])

  // 05-3: Ctrl/Cmd + A は文脈チーム(最後に選んだ座席のチーム)の全席を選ぶ。
  // 文脈が無い(1席も選んでいない)ときは何も選ばず、ブラウザ既定の全選択も妨げない
  const selectContextTeamSeats = useCallback(() => {
    const current = selectedSeatIdsRef.current
    const anchorId = current[current.length - 1]
    const anchor = anchorId ? layout.seats.find((s) => s.id === anchorId) : undefined
    if (!anchor) return false
    applySeatSelection(layout.seats.filter((s) => s.teamId === anchor.teamId).map((s) => s.id))
    return true
  }, [layout.seats, applySeatSelection])

  // 押下の記録。論理座標も対象矩形も要らない — 判定に使うのは移動量だけ
  const beginPress = useCallback((e: ReactPointerEvent) => {
    suppressTapRef.current = false
    pressRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onTeamLabelEditPointerDown = useCallback(
    (teamId: string, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      if (!layout.teams.some((t) => t.id === teamId)) return
      applySeatSelection([])
      setEditSelectedObject(null)
      undoChip.dismiss()
      beginPress(e)
    },
    [isEditMode, layout.teams, applySeatSelection, undoChip, beginPress]
  )

  const onObjectEditPointerDown = useCallback(
    (ref: LayoutObjectRef, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      setEditSelectedObject(ref)
      applySeatSelection([])
      undoChip.dismiss()
      beginPress(e)
    },
    [isEditMode, applySeatSelection, undoChip, beginPress]
  )

  // 05-3: チーム枠タップ = 移動ゴースト。ラベルを掴んで動かした後の click はここで捨てる。
  // 座席選択とオブジェクト選択は相互に打ち消す(選択は全体で1系統)
  const onTeamEditTap = useCallback(
    (teamId: string) => {
      if (!isEditMode) return
      if (consumeTapSuppression()) return
      applySeatSelection([])
      setEditSelectedObject(null)
      undoChip.dismiss()
      onTeamTap?.(teamId)
    },
    [isEditMode, applySeatSelection, undoChip, onTeamTap]
  )

  // 05-3: 家具・会議室タップ = 移動ゴースト。選択自体は pointerdown で済んでいるので、
  // ここは「動かしていないこと」を確かめてゴーストへ渡すだけ
  const onObjectEditTap = useCallback(
    (ref: LayoutObjectRef) => {
      if (!isEditMode) return
      if (consumeTapSuppression()) return
      onObjectTap?.(ref)
    },
    [isEditMode, onObjectTap]
  )

  // 押下追跡。ここで editor へは何も発行しない — 移動の発行はゴーストの「配置」だけが持つ
  useEffect(() => {
    if (!isEditMode) return

    const onMove = (e: PointerEvent) => {
      const press = pressRef.current
      if (!press || press.pointerId !== e.pointerId) return
      if (!press.moved && Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > DRAG_THRESHOLD_PX) {
        press.moved = true
      }
    }

    const onUp = (e: PointerEvent) => {
      const press = pressRef.current
      if (!press || press.pointerId !== e.pointerId) return
      // 動かして離した = ドラッグ確定。この直後に来る click はタップではないので捨てる
      suppressTapRef.current = press.moved
      pressRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isEditMode])

  // 05-3 のキー操作。Escape は1回の押下で ①選択解除 ②セッション終了(ステージング破棄)の
  // 両方を発火させる — 確認は挟まない
  useEffect(() => {
    if (!isEditMode) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (selectContextTeamSeats()) e.preventDefault()
        return
      }
      if (e.key !== 'Escape') return
      clearSelection()
      onEndSession?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditMode, clearSelection, selectContextTeamSeats, onEndSession])

  // 編集モードOFFへ遷移した瞬間に編集専用の状態を掃除(view 側の状態には影響しない)
  useEffect(() => {
    if (isEditMode) return
    // 編集モード OFF への遷移時だけ編集専用 state を掃除する。遷移イベントに対する後始末
    selectedSeatIdsRef.current = []
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditSelectedSeatIds([])
    setEditSelectedObject(null)
    undoChip.dismiss()
    pressRef.current = null
  }, [isEditMode, undoChip])

  return {
    editSelectedSeatIds,
    editSelectedObject,
    undoChip,
    selectSeat,
    onTeamLabelEditPointerDown,
    onObjectEditPointerDown,
    onTeamEditTap,
    onObjectEditTap,
    clearSelection,
  }
}
