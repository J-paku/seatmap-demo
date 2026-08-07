import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
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

// 一覧とデフォルトIDは常にlocalStorageへ書いてから状態へ写す関係なので、2つで1組として扱う
type StoredLayouts = {
  layoutMetas: LayoutMeta[]
  defaultLayoutId: string | null
}

const readStoredLayouts = (): StoredLayouts => ({
  layoutMetas: loadLayoutMetas(),
  defaultLayoutId: loadDefaultLayoutId(),
})

// getSnapshotは呼ぶたびに同じ参照を返す必要があるので、最初の1回だけ読んで保持する
let storedLayoutsSnapshot: StoredLayouts | null = null
const getStoredLayouts = (): StoredLayouts => {
  if (!storedLayoutsSnapshot) storedLayoutsSnapshot = readStoredLayouts()
  return storedLayoutsSnapshot
}

// 静的書き出しHTMLは「カスタム0件・デフォルト未設定」で焼かれている。初回クライアント描画を
// それに揃えないとトグル名やカウンターがHTMLと食い違い、React 19が例外#418を出す
const EMPTY_STORED_LAYOUTS: StoredLayouts = { layoutMetas: [], defaultLayoutId: null }
const getServerStoredLayouts = (): StoredLayouts => EMPTY_STORED_LAYOUTS

// 起動直後の値は後から変わらないので購読先が無い。以降の変更は保存後の読み直しが受け持つ
const noop = (): void => undefined
const subscribeStoredLayouts = (): (() => void) => noop

// アイランドの開閉・一覧の読み込み・選択と作成の操作を持つ。展開パネルの中身の描画自体は
// STEP4のコンポーネント側が担うためここでは持たない
export const useLayoutSwitcher = (): UseLayoutSwitcherResult => {
  const { source, setOfficial, setCustom } = useLayoutSource()
  const { announce } = useGlobalAnnouncement()
  const [isOpen, setIsOpen] = useState(false)
  // トグルボタンの現在名表示にも一覧が要るため、マウント時点の保存内容を見る。
  // ハイドレーション直後に差し替わる(ペイント前に同期で流れるためちらつかない)
  const hydratedLayouts = useSyncExternalStore(
    subscribeStoredLayouts,
    getStoredLayouts,
    getServerStoredLayouts
  )
  // 作成・削除・デフォルト変更のあとはこちらが優先。中身は保存直後に読み直した写し
  const [savedLayouts, setSavedLayouts] = useState<StoredLayouts | null>(null)
  const { layoutMetas, defaultLayoutId } = savedLayouts ?? hydratedLayouts
  // 削除確認ダイアログの対象。null なら非表示(window.confirmは使わずダイアログで確定させる)
  const [deleteTarget, setDeleteTarget] = useState<LayoutMeta | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])

  // 保存の直後は必ずここを通してlocalStorageから読み直す。書いた値を手で組み立て直さないので
  // 「保存内容と画面がずれる」経路を作らない
  const syncFromStorage = useCallback(() => setSavedLayouts(readStoredLayouts()), [])

  // 展開のたびに読み直す。作成・削除など他経路での変更をここが取りこぼさないため
  const open = useCallback(() => {
    syncFromStorage()
    setIsOpen(true)
  }, [syncFromStorage])

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
    announce(`[info]${FLOOR_NAME}に切り替えました`)
    close()
  }, [setOfficial, announce, close])

  // カスタムレイアウトへ切り替えてアイランドを閉じる
  const selectCustom = useCallback(
    (layoutId: string) => {
      const meta = layoutMetas.find((m) => m.layoutId === layoutId)
      setCustom(layoutId)
      announce(`[info]${meta?.layoutName ?? ''}に切り替えました`)
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
      syncFromStorage()
      setCustom(layoutId)
      announce(`[success]${name}を作成しました`)
      close()
    },
    [syncFromStorage, setCustom, announce, close]
  )

  // 星のトグル: 同じ行を再度押したら解除、他の行を押したら上書きして常に1件だけを指す。
  // トーンは明示する。無指定だと「解除しました」がキーワード推定で警告トーストになり、
  // 正常操作なのに赤系の見た目で出てしまう
  const toggleDefault = useCallback(
    (layoutId: string) => {
      if (defaultLayoutId === layoutId) {
        saveDefaultLayoutId(null)
        syncFromStorage()
        announce('[info]デフォルト設定を解除しました')
        return
      }
      const meta = layoutMetas.find((m) => m.layoutId === layoutId)
      saveDefaultLayoutId(layoutId)
      syncFromStorage()
      announce(`[success]次回から「${meta?.layoutName ?? ''}」を最初に表示します`)
    },
    [defaultLayoutId, layoutMetas, syncFromStorage, announce]
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
    if (defaultLayoutId === layoutId) saveDefaultLayoutId(null)
    syncFromStorage()
    if (source.type === 'custom' && source.layoutId === layoutId) {
      setOfficial()
    }
    setDeleteTarget(null)
    announce('[success]レイアウトを削除しました')
  }, [deleteTarget, defaultLayoutId, syncFromStorage, source, setOfficial, announce])

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
