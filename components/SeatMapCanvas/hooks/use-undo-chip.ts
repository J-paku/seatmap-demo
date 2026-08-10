import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Transform } from '@/utils/layout/geometry'
import type { Rect } from '@/utils/layout/rect'

// 07: 直前アクション対象の直下に出す「元に戻す」チップ。次操作または4秒経過で消える

const DISMISS_MS = 4000
// チップは対象の少し下に出す
const OFFSET_Y = 40

type UndoChip = {
  pos: { x: number; y: number } | null
  // 操作種別ごとの文言(「削除しました」等)
  message: string
  // 削除時のみ: 消えた位置に残す残像フレーム(画面座標)
  frame: Rect | null
  // 論理座標を渡すと現在の変換で画面座標へ直して表示する
  showAt: (logicalX: number, logicalY: number, message: string, frame?: Rect | null) => void
  dismiss: () => void
}

export const useUndoChip = (transformRef: RefObject<Transform>): UndoChip => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [message, setMessage] = useState('')
  const [frame, setFrame] = useState<Rect | null>(null)
  const timeoutRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const dismiss = useCallback(() => {
    setPos(null)
    setFrame(null)
    window.clearTimeout(timeoutRef.current)
  }, [])

  const showAt = useCallback(
    (logicalX: number, logicalY: number, nextMessage: string, nextFrame: Rect | null = null) => {
      const t = transformRef.current
      setPos({ x: logicalX * t.scale + t.translateX, y: (logicalY + OFFSET_Y) * t.scale + t.translateY })
      setMessage(nextMessage)
      // 残像フレームも論理座標で受けて画面座標へ直す
      setFrame(
        nextFrame
          ? {
              x: nextFrame.x * t.scale + t.translateX,
              y: nextFrame.y * t.scale + t.translateY,
              w: nextFrame.w * t.scale,
              h: nextFrame.h * t.scale,
            }
          : null
      )
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        setPos(null)
        setFrame(null)
      }, DISMISS_MS)
    },
    [transformRef]
  )

  // ドラッグ追従エフェクトの依存に入るため、参照ごと安定させる
  return useMemo(() => ({ pos, message, frame, showAt, dismiss }), [pos, message, frame, showAt, dismiss])
}
