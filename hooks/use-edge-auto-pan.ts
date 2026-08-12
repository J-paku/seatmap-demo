import { useCallback, useEffect, useMemo, useRef } from 'react'
import { EDGE_PAN_END_EVENT, EDGE_PAN_EVENT, edgePanDelta } from '@/utils/layout/edge-pan'
import type { EdgePanDelta } from '@/utils/layout/edge-pan'

// ドラッグ中の画面端自動パンの駆動役。毎 pointermove の update でポインタを受け取り、
// 端ゾーンにいる間 rAF ごとにパンイベントを飛ばす。変換モデルには直接触れない —
// ゴースト層はキャンバスの DOM 木の外にいるため、結線はイベント経由の一方向に保つ
// (受け手は SeatMapCanvas の useViewportInput)

type EdgeAutoPan = {
  // ドラッグ追従中に毎 pointermove で呼ぶ。ゾーン外なら自動で止まる。
  // onFrame はパン1フレームごとの追加処理(ドラッグ対象の座標を引き直す等)
  update: (x: number, y: number, rect: DOMRect | null, onFrame?: () => void) => void
  // ドラッグ終了・中断時に呼ぶ
  stop: () => void
}

export const useEdgeAutoPan = (): EdgeAutoPan => {
  const stateRef = useRef<{ x: number; y: number; rect: DOMRect; onFrame?: () => void } | null>(null)
  const rafRef = useRef(0)

  const stop = useCallback(() => {
    stateRef.current = null
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      window.dispatchEvent(new Event(EDGE_PAN_END_EVENT))
    }
  }, [])

  const update = useCallback((x: number, y: number, rect: DOMRect | null, onFrame?: () => void) => {
    if (!rect) return
    stateRef.current = { x, y, rect, onFrame }
    if (rafRef.current) return
    if (!edgePanDelta({ x, y }, rect)) return
    const tick = () => {
      const s = stateRef.current
      const delta = s ? edgePanDelta({ x: s.x, y: s.y }, s.rect) : null
      if (!s || !delta) {
        rafRef.current = 0
        window.dispatchEvent(new Event(EDGE_PAN_END_EVENT))
        return
      }
      window.dispatchEvent(new CustomEvent<EdgePanDelta>(EDGE_PAN_EVENT, { detail: delta }))
      s.onFrame?.()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // アンマウント時はループの後始末のみ(END イベントはもう聞き手がいない)
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  return useMemo(() => ({ update, stop }), [update, stop])
}
