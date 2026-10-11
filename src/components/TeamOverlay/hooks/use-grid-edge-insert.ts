import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

// 行・列を足すと、増えた帯はスクロールの外側に生まれることがある(特に左右)。
// 足した直後にその帯までスクロールし、短い点灯で「どこが増えたか」を示す。
//
// 帯の位置は保持しない。edge さえ分かれば「上=先頭行 / 下=末尾行 / 左=先頭列 / 右=末尾列」で
// 一意に決まるので、その時点のグリッド寸法と突き合わせて判定する(インデックスを覚えると、
// 直後に別の追加や削除が入った時に古い位置を指したままになる)

type GridEdge = 'top' | 'bottom' | 'left' | 'right'

// 点灯の長さ。CSS の gridInsertReveal と揃える
const REVEAL_MS = 700

type GridEdgeInsert = {
  // 点灯中の帯。null は点灯なし
  insertedEdge: GridEdge | null
  // 追加操作をこの1本に通すと、スクロールと点灯が予約される
  notifyInsert: (edge: GridEdge) => void
  // セルが点灯対象かの判定。呼び出し側はグリッドの現在の行数・列数を渡す
  isInsertedCell: (row: number, col: number, rows: number, cols: number) => boolean
}

export const useGridEdgeInsert = (scrollRef: RefObject<HTMLElement | null>): GridEdgeInsert => {
  const [inserted, setInserted] = useState<{ edge: GridEdge; seq: number } | null>(null)
  const seqRef = useRef(0)

  const notifyInsert = useCallback((edge: GridEdge) => {
    seqRef.current += 1
    setInserted({ edge, seq: seqRef.current })
  }, [])

  // スクロールは DOM に新しい帯が入った後でなければ端まで届かないため layout effect で行う
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || inserted === null) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
    if (inserted.edge === 'left') el.scrollTo({ left: 0, behavior })
    else if (inserted.edge === 'right') el.scrollTo({ left: el.scrollWidth, behavior })
    else if (inserted.edge === 'top') el.scrollTo({ top: 0, behavior })
    else el.scrollTo({ top: el.scrollHeight, behavior })
  }, [inserted, scrollRef])

  // 点灯は時間で消す。連続で足した時は最後の1回だけが残る(seqが変わるとタイマーも張り直す)
  useEffect(() => {
    if (inserted === null) return
    const timer = window.setTimeout(() => setInserted(null), REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [inserted])

  const isInsertedCell = useCallback(
    (row: number, col: number, rows: number, cols: number): boolean => {
      if (inserted === null) return false
      if (inserted.edge === 'top') return row === 0
      if (inserted.edge === 'bottom') return row === rows - 1
      if (inserted.edge === 'left') return col === 0
      return col === cols - 1
    },
    [inserted]
  )

  return { insertedEdge: inserted?.edge ?? null, notifyInsert, isInsertedCell }
}
