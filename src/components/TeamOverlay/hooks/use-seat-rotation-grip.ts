import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { safeSetPointerCapture } from '@/utils/gesture/pointer-capture'
import { triggerHaptic } from '@/utils/haptic'
import { angleToRotation, CLOCKWISE_NEXT, DRAG_DEAD_ZONE_PX } from '../utils/snap-grip-rotation'
import type { Seat } from '@/types'

// STEP D1: 座席の回転グリップ。タップとドラッグを1つのポインタ経路で兼ねる
//
// - pointerdownからの移動量がデッドゾーン未満のままpointerupへ到達したらタップ扱い(時計回りに1段)
// - デッドゾーンを超えたらドラッグ扱いへ切り替わり、以後は移動角度をスナップして即座に反映する
// - draft.rotateSeatを呼んでもpropsのrotationへ反映されるのは次のレンダーからで1フレーム遅れる。
//   直近に自分が発行した回転値をrefで持ち、次の計算の基準は常にこのrefにする
//   (基準をpropsのままにすると、反映が追いつく前の連続タップ/連続スナップが同じ値を出し続ける)

// pending(押下のみ)→dragging(デッドゾーン超え)の一方向遷移。use-seat-drag.tsと同じ方針
type GripPointerState =
  | { kind: 'idle' }
  | { kind: 'active'; pointerId: number; startX: number; startY: number; dragging: boolean }

export type UseSeatRotationGripOptions = {
  seatId: string
  // 現在の回転値。propsのため1フレーム遅れる前提で、実際の判定基準はlastRotationRefへ持つ
  rotation: Seat['rotation']
  onRotate: (seatId: string, rotation: Seat['rotation']) => void
  // STEP D2: デッドゾーンを超えてドラッグへ切り替わった/戻った瞬間だけ呼ぶ。
  // 親(EditSeatCell)がコンパスガイドの表示切り替えに使う
  onDraggingChange: (dragging: boolean) => void
}

export type UseSeatRotationGripResult = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

export const useSeatRotationGrip = ({
  seatId,
  rotation,
  onRotate,
  onDraggingChange,
}: UseSeatRotationGripOptions): UseSeatRotationGripResult => {
  const stateRef = useRef<GripPointerState>({ kind: 'idle' })
  // 直近に自分が発行した回転値。イベントハンドラ内での書き換えが基準そのものなので、
  // レンダー中には触らずコミット後のeffectでpropsの最新値へ同期する(refをrender中に書き換えない)
  const lastRotationRef = useRef<Seat['rotation']>(rotation)
  useEffect(() => {
    lastRotationRef.current = rotation
  }, [rotation])

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    // STEP D1: グリップを触っても背後の席カード(draggable/pointer系ドラッグ)を誘発しない
    e.stopPropagation()
    triggerHaptic('light')
    safeSetPointerCapture(e.currentTarget, e.pointerId)
    stateRef.current = {
      kind: 'active',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    }
  }, [])

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (state.kind !== 'active' || state.pointerId !== e.pointerId) return
      e.stopPropagation()
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      if (!state.dragging) {
        if (Math.hypot(dx, dy) < DRAG_DEAD_ZONE_PX) return
        stateRef.current = { ...state, dragging: true }
        onDraggingChange(true)
      }
      const snapped = angleToRotation(dx, dy)
      if (snapped !== lastRotationRef.current) {
        lastRotationRef.current = snapped
        onRotate(seatId, snapped)
      }
    },
    [seatId, onRotate, onDraggingChange]
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (state.kind !== 'active' || state.pointerId !== e.pointerId) return
      e.stopPropagation()
      if (!state.dragging) {
        const next = CLOCKWISE_NEXT[lastRotationRef.current]
        lastRotationRef.current = next
        onRotate(seatId, next)
      } else {
        onDraggingChange(false)
      }
      stateRef.current = { kind: 'idle' }
    },
    [seatId, onRotate, onDraggingChange]
  )

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (state.kind !== 'active' || state.pointerId !== e.pointerId) return
      e.stopPropagation()
      if (state.dragging) onDraggingChange(false)
      stateRef.current = { kind: 'idle' }
    },
    [onDraggingChange]
  )

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }
}
