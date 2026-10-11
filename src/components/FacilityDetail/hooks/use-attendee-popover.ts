import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttendeePopoverState } from '../type'
import { CLOSE_DELAY_MS, measure } from '../utils/place-attendee-popover'

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
      setState(prev =>
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
