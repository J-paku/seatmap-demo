import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  loadDefaultLayoutId,
  loadLayoutMetas,
  saveCustomLayout,
  saveLayoutMetas,
} from '@/lib/layout-persistence'
import { createEmptyLayout, createLayoutId } from '@/utils/layout-id'
import { useLayoutSource } from '@/contexts/layout-source-context'
import type { LayoutMeta } from '@/types'

export type UseLayoutSwitcherResult = {
  isOpen: boolean
  layoutMetas: LayoutMeta[]
  defaultLayoutId: string | null
  rootRef: RefObject<HTMLDivElement | null>
  toggle: () => void
  close: () => void
  selectOfficial: () => void
  selectCustom: (layoutId: string) => void
  createLayout: (rawName: string) => void
}

// アイランドの開閉・一覧の読み込み・選択と作成の操作を持つ。展開パネルの中身の描画自体は
// STEP4のコンポーネント側が担うためここでは持たない
export const useLayoutSwitcher = (): UseLayoutSwitcherResult => {
  const { setOfficial, setCustom } = useLayoutSource()
  const [isOpen, setIsOpen] = useState(false)
  // トグルボタンの現在名表示にも一覧が要るため、マウント時点で一度読んでおく
  const [layoutMetas, setLayoutMetas] = useState<LayoutMeta[]>(() => loadLayoutMetas())
  const [defaultLayoutId, setDefaultLayoutId] = useState<string | null>(() => loadDefaultLayoutId())
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])

  // 展開のたびに読み直す。作成・削除など他経路での変更をここが取りこぼさないため
  const open = useCallback(() => {
    setLayoutMetas(loadLayoutMetas())
    setDefaultLayoutId(loadDefaultLayoutId())
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

  // 公式レイアウトへ切り替えてアイランドを閉じる。開いたままだと切り替わったキャンバスが隠れるため
  const selectOfficial = useCallback(() => {
    setOfficial()
    close()
  }, [setOfficial, close])

  // カスタムレイアウトへ切り替えてアイランドを閉じる
  const selectCustom = useCallback(
    (layoutId: string) => {
      setCustom(layoutId)
      close()
    },
    [setCustom, close]
  )

  // 新規カスタムレイアウトを作成し、作成したレイアウトへ即座に切り替えてアイランドを閉じる。
  // 空欄送信時は「マイレイアウト <件数+1>」を既定名として採用する
  const createLayout = useCallback(
    (rawName: string) => {
      const metas = loadLayoutMetas()
      const trimmedName = rawName.trim()
      const name = trimmedName || `マイレイアウト ${metas.length + 1}`
      const layoutId = createLayoutId(metas)
      const nextMetas: LayoutMeta[] = [
        ...metas,
        { layoutId, layoutName: name, updatedAt: new Date().toISOString() },
      ]
      saveCustomLayout(layoutId, createEmptyLayout(layoutId, name))
      saveLayoutMetas(nextMetas)
      setLayoutMetas(nextMetas)
      setCustom(layoutId)
      close()
    },
    [setCustom, close]
  )

  return {
    isOpen,
    layoutMetas,
    defaultLayoutId,
    rootRef,
    toggle,
    close,
    selectOfficial,
    selectCustom,
    createLayout,
  }
}
