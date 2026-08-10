import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { triggerHaptic } from '@/utils/haptic'
import { useFabLongPress } from './use-fab-long-press'

// メニュー項目の実体。ロービングタブの移動対象をこれで数える
const MENU_ITEM_SELECTOR = '[role=menuitem]'

export type UseAdminAddFabParams = {
  onSelectTeam: () => void
  onSelectFacility: () => void
  onEditLayout: () => void
}

type UseAdminAddFabResult = {
  isMenuOpen: boolean
  closeMenu: () => void
  fabRef: RefObject<HTMLButtonElement | null>
  menuRef: RefObject<HTMLDivElement | null>
  fabHandlers: {
    onPointerDown: (e: ReactPointerEvent) => void
    onPointerMove: (e: ReactPointerEvent) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
    onClick: () => void
  }
  onMenuKeyDown: (e: ReactKeyboardEvent) => void
  handleSelectTeam: () => void
  handleSelectFacility: () => void
  handleEditLayout: () => void
}

// スピードダイヤルの開閉だけを持つ。何を配置するかは呼び出し側が知る
export const useAdminAddFab = ({
  onSelectTeam,
  onSelectFacility,
  onEditLayout,
}: UseAdminAddFabParams): UseAdminAddFabResult => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // 一度も開いていない初回描画で FAB へ焦点を移さないための目印
  const wasMenuOpenRef = useRef(false)

  const closeMenu = () => setIsMenuOpen(false)

  // メニューが開いている間だけ背後のスクロールを止める(参照カウント式)
  useBodyScrollLock(isMenuOpen)

  // Esc で閉じる
  useEffect(() => {
    if (!isMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  const menuItems = (): HTMLElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? [])

  // 開いたら先頭項目へ、閉じたら FAB へ焦点を戻す。
  // 項目を選んで閉じた時は親が FAB ごと外すので、この効果自体が走らない
  useEffect(() => {
    if (isMenuOpen) {
      wasMenuOpenRef.current = true
      menuItems()[0]?.focus()
      return
    }
    if (!wasMenuOpenRef.current) return
    wasMenuOpenRef.current = false
    fabRef.current?.focus()
  }, [isMenuOpen])

  // ↑↓ で項目を巡回する。端は反対側へ回り込む
  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = menuItems()
    const current = items.findIndex((item) => item === document.activeElement)
    const delta = e.key === 'ArrowDown' ? 1 : -1
    items[(current + delta + items.length) % items.length]?.focus()
  }

  // 500ms 長押しでメニューを開かず編集モードへ直行する。タイマー発火自体には haptic を鳴らさない仕様
  const longPress = useFabLongPress({
    onLongPress: () => {
      closeMenu()
      onEditLayout()
    },
  })

  const onPointerDown = (e: ReactPointerEvent) => {
    triggerHaptic('light')
    longPress.handlers.onPointerDown(e)
  }

  // 長押しが発火した直後の click はここで消費する。それ以外は通常のメニュー開閉トグル
  const onClick = () => {
    if (longPress.consumeFired()) return
    setIsMenuOpen((open) => !open)
  }

  // 各項目は必ず先にメニューを閉じてから本処理を呼ぶ。逆順だと
  // 消えかけのメニューの上に本処理の結果が重なって見える
  const handleSelectTeam = () => {
    triggerHaptic('light')
    closeMenu()
    onSelectTeam()
  }

  const handleSelectFacility = () => {
    triggerHaptic('light')
    closeMenu()
    onSelectFacility()
  }

  // レイアウト編集の行。メニュー経由なので長押し直行と異なり haptic を鳴らす
  const handleEditLayout = () => {
    triggerHaptic('light')
    closeMenu()
    onEditLayout()
  }

  return {
    isMenuOpen,
    closeMenu,
    fabRef,
    menuRef,
    fabHandlers: {
      onPointerDown,
      onPointerMove: longPress.handlers.onPointerMove,
      onPointerUp: longPress.handlers.onPointerUp,
      onPointerLeave: longPress.handlers.onPointerLeave,
      onPointerCancel: longPress.handlers.onPointerCancel,
      onClick,
    },
    onMenuKeyDown,
    handleSelectTeam,
    handleSelectFacility,
    handleEditLayout,
  }
}
