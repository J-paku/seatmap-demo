import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useUndoChip } from './use-undo-chip'
import { siblingRectsForObject, siblingRectsForTeam } from '../utils/sibling-rects'
import type { EditDrag, LivePosition, Rect, Viewport } from '../type'
import { useEdgeAutoPan } from '@/hooks/use-edge-auto-pan'
import { computeSnap, snapThreshold } from '@/utils/layout/snap-guides'
import type { SnapGuide } from '@/utils/layout/snap-guides'
import { rectOfRef } from '@/utils/layout/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'

// 07: 編集モードのチーム枠・設備のドラッグ移動と、座席の複数選択。閲覧モードではこのロジックへ到達しない。
// 座席そのものはキャンバスに描かれない(CLAUDE.md 不変ルール1・仕様 00-2)。座席位置の編集は
// チームオーバーレイのグリッド(編集4)が担い、ここが持つのは「どの座席を選んでいるか」だけ

// ドラッグとみなす最小移動量
const DRAG_THRESHOLD_PX = 3

type Options = {
  viewport: Viewport
  layout: SeatLayout
  isEditMode: boolean
  onTeamMove?: (teamId: string, x: number, y: number) => void
  onSeatEditSelect?: (seatId: string | null) => void
  onObjectMove?: (ref: LayoutObjectRef, x: number, y: number) => void
  // 05-3: タップ(動かさずに離した押下)で移動ゴーストを開く。実体はその場に残る。
  // ドラッグで動かし切った直後の click では発火しない — 同じ操作でゴーストまで開くと二重になる
  onTeamTap?: (teamId: string) => void
  onObjectTap?: (ref: LayoutObjectRef) => void
  // Escape の2段目。セッション終了=ステージング破棄(確認なし・仕様 05-3)
  onEndSession?: () => void
}

type EditDragState = {
  liveTeamPos: LivePosition | null
  liveObjectPos: LivePosition | null
  snapGuides: SnapGuide[]
  editSelectedSeatIds: string[]
  editSelectedObject: LayoutObjectRef | null
  undoChipPos: { x: number; y: number } | null
  undoChipMessage: string
  undoChipFrame: Rect | null
  showUndoChipAt: (logicalX: number, logicalY: number, message: string, frame?: Rect | null) => void
  selectSeat: (seatId: string, toggle: boolean) => void
  onTeamLabelEditPointerDown: (teamId: string, e: ReactPointerEvent) => void
  onObjectEditPointerDown: (ref: LayoutObjectRef, e: ReactPointerEvent) => void
  // 05-3: タップ判定を通した後の入口。呼ぶのは click ハンドラ側
  onTeamEditTap: (teamId: string) => void
  onObjectEditTap: (ref: LayoutObjectRef) => void
  clearSelection: () => void
  dismissUndoChip: () => void
}

export const useEditDrag = ({
  viewport,
  layout,
  isEditMode,
  onTeamMove,
  onSeatEditSelect,
  onObjectMove,
  onTeamTap,
  onObjectTap,
  onEndSession,
}: Options): EditDragState => {
  const { transformRef, rect } = viewport
  const editDragRef = useRef<EditDrag>({ kind: 'none' })
  const undoChip = useUndoChip(transformRef)
  // 画面端自動パン。掴んだまま端へ寄せると地図側が滑り、行き先が画面外へ広がる
  const edgePan = useEdgeAutoPan()
  // ドラッグで動かした直後にブラウザが送る click を1回だけ握り潰すための目印。
  // 読み取りと消費を1関数へ閉じるのは FAB の長押し(consumeFired)と同じ理由 —
  // 呼び出し側へ ref を渡すと外から書き換える形になり React Compiler の検査に反する
  const suppressTapRef = useRef(false)

  const consumeTapSuppression = (): boolean => {
    if (!suppressTapRef.current) return false
    suppressTapRef.current = false
    return true
  }

  // ライブ座標(ドラッグ中のみ描画反映。確定はpointerup時に親へ1回通知)
  const [liveTeamPos, setLiveTeamPos] = useState<LivePosition | null>(null)
  const [liveObjectPos, setLiveObjectPos] = useState<LivePosition | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
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

  // ポインタの論理座標(viewBox 系)。画面差分の積み上げではなく毎回ここから引き直すことで、
  // 画面端自動パンで変換が動いている間も掴んだ矩形が指の真下に残る
  const pointerLogical = useCallback(
    (clientX: number, clientY: number) => {
      const r = rect()
      if (!r) return null
      const t = transformRef.current
      return { x: (clientX - r.left - t.translateX) / t.scale, y: (clientY - r.top - t.translateY) / t.scale }
    },
    [rect, transformRef]
  )

  const onTeamLabelEditPointerDown = useCallback(
    (teamId: string, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      const p = pointerLogical(e.clientX, e.clientY)
      if (!p) return
      suppressTapRef.current = false
      applySeatSelection([])
      setEditSelectedObject(null)
      undoChip.dismiss()
      // 2本目の指がドラッグ状態を上書きしても、1本目が起こしたパンループを残さない
      edgePan.stop()
      editDragRef.current = {
        kind: 'team',
        teamId,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        grabDx: p.x - team.area.x,
        grabDy: p.y - team.area.y,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        liveX: team.area.x,
        liveY: team.area.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout.teams, applySeatSelection, undoChip, pointerLogical, edgePan]
  )

  const onObjectEditPointerDown = useCallback(
    (ref: LayoutObjectRef, e: ReactPointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const objRect = rectOfRef(layout, ref)
      if (!objRect) return
      const p = pointerLogical(e.clientX, e.clientY)
      if (!p) return
      suppressTapRef.current = false
      setEditSelectedObject(ref)
      applySeatSelection([])
      undoChip.dismiss()
      // 2本目の指がドラッグ状態を上書きしても、1本目が起こしたパンループを残さない
      edgePan.stop()
      editDragRef.current = {
        kind: 'object',
        ref,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        grabDx: p.x - objRect.x,
        grabDy: p.y - objRect.y,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        liveX: objRect.x,
        liveY: objRect.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout, applySeatSelection, undoChip, pointerLogical, edgePan]
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

  // 編集ドラッグの document 追従(pointerId ベース)
  useEffect(() => {
    if (!isEditMode) return

    // 掴んだ矩形をポインタの真下へ引き直す。pointermove と自動パンの両方から毎フレーム呼ばれる
    const follow = (clientX: number, clientY: number) => {
      const drag = editDragRef.current
      if (drag.kind === 'none') return
      const p = pointerLogical(clientX, clientY)
      if (!p) return
      const scale = transformRef.current.scale
      const rawX = p.x - drag.grabDx
      const rawY = p.y - drag.grabDy

      if (drag.kind === 'object') {
        const rect = rectOfRef(layout, drag.ref)
        if (!rect) return
        const candidate: Rect = { x: rawX, y: rawY, w: rect.w, h: rect.h }
        const snap = computeSnap(candidate, siblingRectsForObject(layout, drag.ref), snapThreshold(candidate, scale))
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveObjectPos({ id: drag.ref.id, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      } else if (drag.kind === 'team') {
        const team = layout.teams.find((t) => t.id === drag.teamId)
        if (!team) return
        const candidate: Rect = { x: rawX, y: rawY, w: team.area.w, h: team.area.h }
        const snap = computeSnap(candidate, siblingRectsForTeam(layout, drag.teamId), snapThreshold(candidate, scale))
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveTeamPos({ id: drag.teamId, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      }
    }

    const onMove = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      if (!drag.moved && Math.hypot(e.clientX - drag.startScreenX, e.clientY - drag.startScreenY) > DRAG_THRESHOLD_PX) {
        drag.moved = true
      }
      drag.lastClientX = e.clientX
      drag.lastClientY = e.clientY
      follow(e.clientX, e.clientY)
      // 自動パンはドラッグが確定してから。端の近くで掴んだだけのタップでパンさせない
      if (drag.moved) {
        edgePan.update(e.clientX, e.clientY, rect(), () => {
          const d = editDragRef.current
          if (d.kind !== 'none') follow(d.lastClientX, d.lastClientY)
        })
      }
    }

    const onUp = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      editDragRef.current = { kind: 'none' }
      edgePan.stop()
      // 動かして離した = ドラッグ確定。この直後に来る click はタップではないので捨てる
      suppressTapRef.current = drag.moved
      setSnapGuides([])
      if (drag.kind === 'object') {
        setLiveObjectPos(null)
        if (drag.moved) {
          onObjectMove?.(drag.ref, drag.liveX, drag.liveY)
          undoChip.showAt(drag.liveX, drag.liveY, '移動しました')
        }
      } else if (drag.kind === 'team') {
        setLiveTeamPos(null)
        if (drag.moved) {
          onTeamMove?.(drag.teamId, drag.liveX, drag.liveY)
          undoChip.showAt(drag.liveX, drag.liveY, '移動しました')
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
  }, [isEditMode, layout, transformRef, onTeamMove, onObjectMove, undoChip, pointerLogical, rect, edgePan])

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
    setLiveTeamPos(null)
    setLiveObjectPos(null)
    setSnapGuides([])
    undoChip.dismiss()
    editDragRef.current = { kind: 'none' }
    // ドラッグ中にセッションが終わった場合、パンループだけ生き残らせない
    edgePan.stop()
  }, [isEditMode, undoChip, edgePan])

  return {
    liveTeamPos,
    liveObjectPos,
    snapGuides,
    editSelectedSeatIds,
    editSelectedObject,
    undoChipPos: undoChip.pos,
    undoChipMessage: undoChip.message,
    undoChipFrame: undoChip.frame,
    showUndoChipAt: undoChip.showAt,
    selectSeat,
    onTeamLabelEditPointerDown,
    onObjectEditPointerDown,
    onTeamEditTap,
    onObjectEditTap,
    clearSelection,
    dismissUndoChip: undoChip.dismiss,
  }
}
