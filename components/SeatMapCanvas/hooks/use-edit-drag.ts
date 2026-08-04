import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUndoChip } from './use-undo-chip'
import { siblingRectsForObject, siblingRectsForSeat, siblingRectsForTeam } from '../utils/sibling-rects'
import type { EditDrag, LivePosition, Rect, Viewport } from '../type'
import { SNAP_THRESHOLD_SCREEN_PX, computeSnap } from '@/utils/snap-guides'
import type { SnapGuide } from '@/utils/snap-guides'
import { rectOfRef } from '@/utils/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'

// 07: 編集モードの座席/チームラベルのドラッグ移動。閲覧モードではこのロジックへ一切到達しない

// ドラッグとみなす最小移動量
const DRAG_THRESHOLD_PX = 3

type Options = {
  viewport: Viewport
  layout: SeatLayout
  isEditMode: boolean
  onSeatMove?: (seatId: string, x: number, y: number) => void
  onTeamMove?: (teamId: string, x: number, y: number) => void
  onSeatEditSelect?: (seatId: string | null) => void
  onObjectMove?: (ref: LayoutObjectRef, x: number, y: number) => void
  // 動かさずに離した空席のタップ。配属シートを開く
  onEmptySeatTap?: (seatId: string) => void
}

type EditDragState = {
  liveSeatPos: LivePosition | null
  liveTeamPos: LivePosition | null
  liveObjectPos: LivePosition | null
  snapGuides: SnapGuide[]
  editSelectedSeatId: string | null
  editSelectedObject: LayoutObjectRef | null
  undoChipPos: { x: number; y: number } | null
  showUndoChipAt: (logicalX: number, logicalY: number) => void
  onSeatEditPointerDown: (seatId: string, e: ReactPointerEvent) => void
  onTeamLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
  onObjectEditPointerDown: (ref: LayoutObjectRef, e: ReactPointerEvent) => void
  clearSelection: () => void
  dismissUndoChip: () => void
}

export const useEditDrag = ({
  viewport,
  layout,
  isEditMode,
  onSeatMove,
  onTeamMove,
  onSeatEditSelect,
  onObjectMove,
  onEmptySeatTap,
}: Options): EditDragState => {
  const { transformRef } = viewport
  const editDragRef = useRef<EditDrag>({ kind: 'none' })
  const undoChip = useUndoChip(transformRef)

  // ライブ座標(ドラッグ中のみ描画反映。確定はpointerup時に親へ1回通知)
  const [liveSeatPos, setLiveSeatPos] = useState<LivePosition | null>(null)
  const [liveTeamPos, setLiveTeamPos] = useState<LivePosition | null>(null)
  const [liveObjectPos, setLiveObjectPos] = useState<LivePosition | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  // 07: 編集モード中に選択された座席1件(フローティングアクションバー表示用)
  const [editSelectedSeatId, setEditSelectedSeatId] = useState<string | null>(null)
  // 07/B: 選択中の会議室・家具。選択は全体で1件だけなので座席選択と相互に打ち消す
  const [editSelectedObject, setEditSelectedObject] = useState<LayoutObjectRef | null>(null)
  const onSeatEditPointerDown = useCallback(
    (seatId: string, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const seat = layout.seats.find((s) => s.id === seatId)
      if (!seat) return
      setEditSelectedSeatId(seatId)
      setEditSelectedObject(null)
      onSeatEditSelect?.(seatId)
      undoChip.dismiss()
      editDragRef.current = {
        kind: 'seat',
        seatId,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startLogicalX: seat.x,
        startLogicalY: seat.y,
        liveX: seat.x,
        liveY: seat.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout.seats, onSeatEditSelect, undoChip]
  )

  const onTeamLabelEditPointerDown = useCallback(
    (teamId: string, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      setEditSelectedSeatId(null)
      setEditSelectedObject(null)
      undoChip.dismiss()
      editDragRef.current = {
        kind: 'team',
        teamId,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startLogicalX: team.area.x,
        startLogicalY: team.area.y,
        liveX: team.area.x,
        liveY: team.area.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout.teams, undoChip]
  )

  const onObjectEditPointerDown = useCallback(
    (ref: LayoutObjectRef, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const rect = rectOfRef(layout, ref)
      if (!rect) return
      setEditSelectedObject(ref)
      setEditSelectedSeatId(null)
      onSeatEditSelect?.(null)
      undoChip.dismiss()
      editDragRef.current = {
        kind: 'object',
        ref,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startLogicalX: rect.x,
        startLogicalY: rect.y,
        liveX: rect.x,
        liveY: rect.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout, onSeatEditSelect, undoChip]
  )

  // 編集ドラッグの document 追従(pointerId ベース)
  useEffect(() => {
    if (!isEditMode) return

    const onMove = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      const scale = transformRef.current.scale
      const dxScreen = e.clientX - drag.startScreenX
      const dyScreen = e.clientY - drag.startScreenY
      if (!drag.moved && Math.hypot(dxScreen, dyScreen) > DRAG_THRESHOLD_PX) drag.moved = true
      const rawX = drag.startLogicalX + dxScreen / scale
      const rawY = drag.startLogicalY + dyScreen / scale
      const thresholdViewBox = SNAP_THRESHOLD_SCREEN_PX / scale

      if (drag.kind === 'seat') {
        const seat = layout.seats.find((s) => s.id === drag.seatId)
        if (!seat) return
        const candidate: Rect = { x: rawX, y: rawY, w: seat.width, h: seat.height }
        const snap = computeSnap(candidate, siblingRectsForSeat(layout, drag.seatId), thresholdViewBox)
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveSeatPos({ id: drag.seatId, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      } else if (drag.kind === 'object') {
        const rect = rectOfRef(layout, drag.ref)
        if (!rect) return
        const candidate: Rect = { x: rawX, y: rawY, w: rect.w, h: rect.h }
        const snap = computeSnap(candidate, siblingRectsForObject(layout, drag.ref), thresholdViewBox)
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveObjectPos({ id: drag.ref.id, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      } else {
        const team = layout.teams.find((t) => t.id === drag.teamId)
        if (!team) return
        const candidate: Rect = { x: rawX, y: rawY, w: team.area.w, h: team.area.h }
        const snap = computeSnap(candidate, siblingRectsForTeam(layout, drag.teamId), thresholdViewBox)
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveTeamPos({ id: drag.teamId, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      }
    }

    const onUp = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      editDragRef.current = { kind: 'none' }
      setSnapGuides([])
      if (drag.kind === 'seat') {
        setLiveSeatPos(null)
        if (drag.moved) {
          onSeatMove?.(drag.seatId, drag.liveX, drag.liveY)
          undoChip.showAt(drag.liveX, drag.liveY)
        } else if (!layout.seats.find((s) => s.id === drag.seatId)?.employeeId) {
          // 空席は1タップで配属シートへ。着席済みはアクションバー経由にする
          onEmptySeatTap?.(drag.seatId)
        }
      } else if (drag.kind === 'object') {
        setLiveObjectPos(null)
        if (drag.moved) {
          onObjectMove?.(drag.ref, drag.liveX, drag.liveY)
          undoChip.showAt(drag.liveX, drag.liveY)
        }
      } else {
        setLiveTeamPos(null)
        if (drag.moved) {
          onTeamMove?.(drag.teamId, drag.liveX, drag.liveY)
          undoChip.showAt(drag.liveX, drag.liveY)
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isEditMode, layout, transformRef, onSeatMove, onTeamMove, onObjectMove, onEmptySeatTap, undoChip])

  // Esc で選択解除。キャンバス余白のクリックと同じ扱い
  useEffect(() => {
    if (!isEditMode) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setEditSelectedSeatId(null)
      setEditSelectedObject(null)
      onSeatEditSelect?.(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditMode, onSeatEditSelect])

  // 編集モードOFFへ遷移した瞬間に編集専用の状態を掃除(view 側の状態には影響しない)
  useEffect(() => {
    if (isEditMode) return
    // 編集モード OFF への遷移時だけ編集専用 state を掃除する。遷移イベントに対する後始末
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditSelectedSeatId(null)
    setEditSelectedObject(null)
    setLiveSeatPos(null)
    setLiveTeamPos(null)
    setLiveObjectPos(null)
    setSnapGuides([])
    undoChip.dismiss()
    editDragRef.current = { kind: 'none' }
  }, [isEditMode, undoChip])

  const clearSelection = useCallback(() => {
    setEditSelectedSeatId(null)
    setEditSelectedObject(null)
    onSeatEditSelect?.(null)
  }, [onSeatEditSelect])

  return {
    liveSeatPos,
    liveTeamPos,
    liveObjectPos,
    snapGuides,
    editSelectedSeatId,
    editSelectedObject,
    undoChipPos: undoChip.pos,
    showUndoChipAt: undoChip.showAt,
    onSeatEditPointerDown,
    onTeamLabelEditPointerDown,
    onObjectEditPointerDown,
    clearSelection,
    dismissUndoChip: undoChip.dismiss,
  }
}
