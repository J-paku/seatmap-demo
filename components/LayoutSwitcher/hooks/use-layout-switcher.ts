import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  deleteCustomLayout,
  loadDefaultLayoutId,
  loadLayoutMetas,
  saveCustomLayout,
  saveDefaultLayoutId,
  saveLayoutMetas,
} from '@/lib/layout-persistence'
import { createEmptyLayout, createLayoutId } from '@/utils/layout-id'
import { useLayoutSource } from '@/contexts/layout-source-context'
import { useGlobalAnnouncement } from '@/components/a11y'
import { FLOOR_NAME } from '@/lib/mock-loader'
import type { LayoutMeta } from '@/types'

export type UseLayoutSwitcherResult = {
  isOpen: boolean
  layoutMetas: LayoutMeta[]
  defaultLayoutId: string | null
  deleteTarget: LayoutMeta | null
  rootRef: RefObject<HTMLDivElement | null>
  toggle: () => void
  close: () => void
  selectOfficial: () => void
  selectCustom: (layoutId: string) => void
  createLayout: (rawName: string) => void
  toggleDefault: (layoutId: string) => void
  requestDelete: (layoutId: string) => void
  cancelDelete: () => void
  confirmDelete: () => void
}

// アイランドの開閉・一覧の読み込み・選択と作成の操作を持つ。展開パネルの中身の描画自体は
// STEP4のコンポーネント側が担うためここでは持たない
export const useLayoutSwitcher = (): UseLayoutSwitcherResult => {
  const { source, setOfficial, setCustom } = useLayoutSource()
  const { setMessage: announce } = useGlobalAnnouncement()
  const [isOpen, setIsOpen] = useState(false)
  // トグルボタンの現在名表示にも一覧が要るため、マウント時点で一度読んでおく
  const [layoutMetas, setLayoutMetas] = useState<LayoutMeta[]>(() => loadLayoutMetas())
  const [defaultLayoutId, setDefaultLayoutId] = useState<string | null>(() => loadDefaultLayoutId())
  // 削除確認ダイアログの対象。null なら非表示(window.confirmは使わずダイアログで確定させる)
  const [deleteTarget, setDeleteTarget] = useState<LayoutMeta | null>(null)
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
  // モバイルでスクロール開始時にも畳みたいため。
  // 削除確認ダイアログはrootRefの外(兄弟)に描くため、開いている間はこのリスナー自体を止める。
  // 止めないとダイアログ内のpointerdownを「外側」と誤認してアイランドが畳まれてしまう
  useEffect(() => {
    if (!isOpen || deleteTarget) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Node ? e.target : null
      if (rootRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, deleteTarget, close])

  // 公式レイアウトへ切り替えてアイランドを閉じる。開いたままだと切り替わったキャンバスが隠れるため
  const selectOfficial = useCallback(() => {
    setOfficial()
    announce(`${FLOOR_NAME}に切り替えました`)
    close()
  }, [setOfficial, announce, close])

  // カスタムレイアウトへ切り替えてアイランドを閉じる
  const selectCustom = useCallback(
    (layoutId: string) => {
      const meta = layoutMetas.find((m) => m.layoutId === layoutId)
      setCustom(layoutId)
      announce(`${meta?.layoutName ?? ''}に切り替えました`)
      close()
    },
    [layoutMetas, setCustom, announce, close]
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
      announce(`${name}を作成しました`)
      close()
    },
    [setCustom, announce, close]
  )

  // 星のトグル: 同じ行を再度押したら解除、他の行を押したら上書きして常に1件だけを指す
  const toggleDefault = useCallback(
    (layoutId: string) => {
      if (defaultLayoutId === layoutId) {
        saveDefaultLayoutId(null)
        setDefaultLayoutId(null)
        announce('デフォルト設定を解除しました')
        return
      }
      const meta = layoutMetas.find((m) => m.layoutId === layoutId)
      saveDefaultLayoutId(layoutId)
      setDefaultLayoutId(layoutId)
      announce(`次回から「${meta?.layoutName ?? ''}」を最初に表示します`)
    },
    [defaultLayoutId, layoutMetas, announce]
  )

  // 削除確認ダイアログの対象を立てる。実削除はconfirmDeleteの確定操作でのみ行う
  const requestDelete = useCallback(
    (layoutId: string) => {
      const meta = layoutMetas.find((m) => m.layoutId === layoutId)
      if (!meta) return
      setDeleteTarget(meta)
    },
    [layoutMetas]
  )

  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  // 削除の後始末は順序固定:
  // (1) メタ+ペイロードを削除 (2) デフォルト指定なら解除 (3) 表示中なら公式へ切り替え (4) 通知
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return
    const { layoutId } = deleteTarget
    deleteCustomLayout(layoutId)
    setLayoutMetas(loadLayoutMetas())
    if (defaultLayoutId === layoutId) {
      saveDefaultLayoutId(null)
      setDefaultLayoutId(null)
    }
    if (source.type === 'custom' && source.layoutId === layoutId) {
      setOfficial()
    }
    setDeleteTarget(null)
    announce('レイアウトを削除しました')
  }, [deleteTarget, defaultLayoutId, source, setOfficial, announce])

  return {
    isOpen,
    layoutMetas,
    defaultLayoutId,
    deleteTarget,
    rootRef,
    toggle,
    close,
    selectOfficial,
    selectCustom,
    createLayout,
    toggleDefault,
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
