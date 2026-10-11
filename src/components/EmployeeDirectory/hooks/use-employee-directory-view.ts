// 社員ディレクトリビューの UI状態・アニメーション・ジェスチャー・キーボード入力を統合管理するフック
import { useEffect, useState } from 'react'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/body-scroll-lock'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'

interface UseEmployeeDirectoryViewResult {
  isVisible: boolean
  sidebarView: 'directory' | 'settings'
  setSidebarView: (view: 'directory' | 'settings') => void
  sheetHandlers: ReturnType<typeof useSwipeToDismiss>['sheetHandlers']
  dragStyle: ReturnType<typeof useSwipeToDismiss>['dragStyle']
  isDragging: boolean
}

export function useEmployeeDirectoryView(
  isOpen: boolean,
  onClose: () => void
): UseEmployeeDirectoryViewResult {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [sidebarView, setSidebarView] = useState<'directory' | 'settings'>('directory')

  // 下スワイプで指に追従して閉じる共通ジェスチャー（他シートと同一パターン）
  // 開く時の触覚(メニューボタン=light)と強度を揃えるため閉じ確定も light に統一
  const { sheetHandlers, dragStyle, isDragging, resetDrag } = useSwipeToDismiss({
    onDismiss: onClose,
    dismissHapticType: 'light',
  })

  // isOpen の変化を監視して isVisible を制御
  useEffect(() => {
    if (isOpen) {
      // 閉じるアニメーション 200ms の完了を待ってアンマウントするための時間差制御
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true)
      // 前回の閉じる操作で残留したドラッグオフセットをリセット
      resetDrag()
    } else {
      // 閉じる時は閉じるアニメーション（200ms）完了後にアンマウント
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, resetDrag])

  // シート表示中は背景(body)のスクロールをロックし、内部スクロールの親への連鎖を防ぐ
  useEffect(() => {
    if (!isOpen) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [isOpen])

  // サイドバーが閉じられたときに設定パネルをリセット
  useEffect(() => {
    // サイドバーが閉じた「瞬間」に設定パネルを畳む。開閉の遷移イベントに対する処理
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setSidebarView('directory')
  }, [isOpen])

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  return {
    isVisible,
    sidebarView,
    setSidebarView,
    sheetHandlers,
    dragStyle,
    isDragging,
  }
}
