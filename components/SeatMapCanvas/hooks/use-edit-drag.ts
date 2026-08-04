import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUndoChip } from './use-undo-chip'
import { siblingRectsForSeat, siblingRectsForTeam } from '../utils/sibling-rects'
import type { EditDrag, LivePosition, Rect, Viewport } from '../type'
import { SNAP_THRESHOLD_SCREEN_PX, computeSnap } from '@/utils/snap-guides'
import type { SnapGuide } from '@/utils/snap-guides'
import type { SeatLayout } from '@/types'

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
}

type EditDragState = {
  liveSeatPos: LivePosition | null
  liveTeamPos: LivePosition | null
  snapGuides: SnapGuide[]
  editSelectedSeatId: string | null
  undoChipPos: { x: number; y: number } | null
  showUndoChipAt: (logicalX: number, logicalY: number) => void
  onSeatEditPointerDown: (seatId: string, e: ReactPointerEvent) => void
  onTeamLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
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
}: Options): EditDragState => {
  const { transformRef } = viewport
  const editDragRef = useRef<EditDrag>({ kind: 'none' })
  const undoChip = useUndoChip(transformRef)

  // ライブ座標(ドラッグ中のみ描画反映。確定はpointerup時に親へ1回通知)
  const [liveSeatPos, setLiveSeatPos] = useState<LivePosition | null>(null)
  const [liveTeamPos, setLiveTeamPos] = useState<LivePosition | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  // 07: 編集モード中に選択された座席1件(フローティングアクションバー表示用)
  const [editSelectedSeatId, setEditSelectedSeatId] = useState<string | null>(null)
  const onSeatEditPointerDown = useCallback(
    (seatId: string, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const seat = layout.seats.find((s) => s.id === seatId)
      if (!seat) return
      setEditSelectedSeatId(seatId)
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
  }, [isEditMode, layout, transformRef, onSeatMove, onTeamMove, undoChip])

  // 編集モードOFFへ遷移した瞬間に編集専用の状態を掃除(view 側の状態には影響しない)
  useEffect(() => {
    if (isEditMode) return
    // 編集モード OFF への遷移時だけ編集専用 state を掃除する。遷移イベントに対する後始末
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditSelectedSeatId(null)
    setLiveSeatPos(null)
    setLiveTeamPos(null)
    setSnapGuides([])
    undoChip.dismiss()
    editDragRef.current = { kind: 'none' }
  }, [isEditMode, undoChip])

  const clearSelection = useCallback(() => {
    setEditSelectedSeatId(null)
    onSeatEditSelect?.(null)
  }, [onSeatEditSelect])

  return {
    liveSeatPos,
    liveTeamPos,
    snapGuides,
    editSelectedSeatId,
    undoChipPos: undoChip.pos,
    showUndoChipAt: undoChip.showAt,
    onSeatEditPointerDown,
    onTeamLabelEditPointerDown,
    clearSelection,
    dismissUndoChip: undoChip.dismiss,
  }
}
