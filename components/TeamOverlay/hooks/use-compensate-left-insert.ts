import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

// STEP B4: 列を左へ足すと新しい空列ぶん内容が右へ押し出され、見ていた場所が横へ飛ぶ。
// 左挿入の累計本数を持ち、増分ぶんだけ scrollLeft を足して視界を保つ
export const useCompensateLeftInsert = (
  ref: RefObject<HTMLElement | null>,
  leftInsertCount: number,
  colStridePx: number
): void => {
  const compensatedRef = useRef(0)
  useLayoutEffect(() => {
    const el = ref.current
    const delta = leftInsertCount - compensatedRef.current
    if (!el || colStridePx <= 0 || delta <= 0) return
    el.scrollLeft += delta * colStridePx
    compensatedRef.current = leftInsertCount
  })
}
