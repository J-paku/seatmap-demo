import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { loadLayoutMetas } from '@/lib/layout-persistence'
import type { LayoutMeta } from '@/types'

export type UseLayoutSwitcherResult = {
  isOpen: boolean
  layoutMetas: LayoutMeta[]
  rootRef: RefObject<HTMLDivElement | null>
  toggle: () => void
  close: () => void
}

// アイランドの開閉と一覧の読み込みだけを持つ。展開パネルの中身(公式ボタン・一覧行・
// 作成フォーム)はSTEP4が担当するためここでは持たない
export const useLayoutSwitcher = (): UseLayoutSwitcherResult => {
  const [isOpen, setIsOpen] = useState(false)
  // トグルボタンの現在名表示にも一覧が要るため、マウント時点で一度読んでおく
  const [layoutMetas, setLayoutMetas] = useState<LayoutMeta[]>(() => loadLayoutMetas())
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])

  // 展開のたびに読み直す。作成・削除など他経路での変更をここが取りこぼさないため
  const open = useCallback(() => {
    setLayoutMetas(loadLayoutMetas())
    setIsOpen(true)
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) close()
    else open()
  }, [isOpen, close, open])

  // 展開中はアイランド外のpointerdownで閉じる。clickではなくpointerdownにするのは
  // モバイルでスクロール開始時にも畳みたいため
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Node ? e.target : null
      if (rootRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, close])

  return { isOpen, layoutMetas, rootRef, toggle, close }
}
