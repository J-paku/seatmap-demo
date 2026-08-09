import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Transform } from '@/utils/layout/geometry'

// 07: 直前アクション対象の直下に出す「元に戻す」チップ。次操作または5秒経過で消える

const DISMISS_MS = 5000
// チップは対象の少し下に出す
const OFFSET_Y = 40

type UndoChip = {
  pos: { x: number; y: number } | null
  // 論理座標を渡すと現在の変換で画面座標へ直して表示する
  showAt: (logicalX: number, logicalY: number) => void
  dismiss: () => void
}

export const useUndoChip = (transformRef: RefObject<Transform>): UndoChip => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const timeoutRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const dismiss = useCallback(() => {
    setPos(null)
    window.clearTimeout(timeoutRef.current)
  }, [])

  const showAt = useCallback(
    (logicalX: number, logicalY: number) => {
      const t = transformRef.current
      setPos({ x: logicalX * t.scale + t.translateX, y: (logicalY + OFFSET_Y) * t.scale + t.translateY })
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setPos(null), DISMISS_MS)
    },
    [transformRef]
  )

  // ドラッグ追従エフェクトの依存に入るため、参照ごと安定させる
  return useMemo(() => ({ pos, showAt, dismiss }), [pos, showAt, dismiss])
}
