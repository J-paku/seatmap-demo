import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttendeePopoverState } from '../type'

// 実測定数。アンカーとの隙間と画面端の余白
const GAP_PX = 4
const EDGE_MARGIN_PX = 16
// 下方の空きがこれ未満なら上向きへ反転する
const FLIP_THRESHOLD_PX = 200
const MIN_HEIGHT_PX = 120
const MIN_RIGHT_PX = 8
const MIN_WIDTH_PX = 180
const MAX_WIDTH_PX = 320
const NARROW_VIEWPORT_PX = 640
const FLIPPED_TOP_MARGIN_PX = 20
// ボタンから離れてから閉じるまでの猶予。ポップオーバーへマウスを移す間を作る
const CLOSE_DELAY_MS = 150

// アンカー矩形から配置を求める。常に右端そろえで左へ展開する
const measure = (meetingId: string, rect: DOMRect, isSticky: boolean): AttendeePopoverState => {
  const spaceBelow = window.innerHeight - (rect.bottom + GAP_PX) - EDGE_MARGIN_PX
  const flipped = spaceBelow < FLIP_THRESHOLD_PX
  const narrowWidth = Math.min(Math.max(MIN_WIDTH_PX, rect.right - MIN_RIGHT_PX), MAX_WIDTH_PX)

  return {
    meetingId,
    top: flipped ? rect.top - GAP_PX : rect.bottom + GAP_PX,
    right: Math.max(MIN_RIGHT_PX, window.innerWidth - rect.right),
    flipped,
    availableHeight: Math.max(flipped ? rect.top - FLIPPED_TOP_MARGIN_PX : spaceBelow, MIN_HEIGHT_PX),
    maxWidthPx: window.innerWidth < NARROW_VIEWPORT_PX ? narrowWidth : MAX_WIDTH_PX,
    isSticky,
  }
}

// 参加者ポップオーバーの開閉と配置。ホバーで仮表示・クリックで固定する
export const useAttendeePopover = () => {
  const [state, setState] = useState<AttendeePopoverState | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  // 固定中はホバー離脱で閉じないため、タイマー側から最新の固定状態を読む
  const isStickyRef = useRef(false)

  // effect へ移すと、同じコミットで張ったタイマーが1フレーム古い値を読むため描画中に写す
  // eslint-disable-next-line react-hooks/refs
  isStickyRef.current = state?.isSticky ?? false

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const close = useCallback(() => {
    clearCloseTimer()
    setState(null)
  }, [clearCloseTimer])

  const onEnter = useCallback(
    (meetingId: string, anchor: HTMLElement) => {
      clearCloseTimer()
      // 固定中のホバーは無視する(別の行を覗いて固定表示が消えるのを防ぐ)
      if (isStickyRef.current) return
      setState(measure(meetingId, anchor.getBoundingClientRect(), false))
    },
    [clearCloseTimer]
  )

  const onLeave = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      if (isStickyRef.current) return
      setState(null)
    }, CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const onToggle = useCallback(
    (meetingId: string, anchor: HTMLElement) => {
      clearCloseTimer()
      setState((prev) =>
        prev && prev.meetingId === meetingId && prev.isSticky
          ? null
          : measure(meetingId, anchor.getBoundingClientRect(), true)
      )
    },
    [clearCloseTimer]
  )

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  // 外側の pointerdown で閉じる。ボタンとポップオーバー本体が同じ属性を持つ
  useEffect(() => {
    if (!state) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('[data-attendee-popover]')) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [state, close])

  // Esc はポップオーバーだけ閉じる。DetailPanels のバブル側ハンドラより先に処理する
  useEffect(() => {
    if (!state) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [state, close])

  return { state, onEnter, onLeave, onToggle, close, cancelClose: clearCloseTimer }
}
