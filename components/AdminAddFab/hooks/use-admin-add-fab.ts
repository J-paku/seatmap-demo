import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { triggerHaptic } from '@/utils/haptic'

// メニュー項目の実体。ロービングタブの移動対象をこれで数える
const MENU_ITEM_SELECTOR = '[role=menuitem]'

export type UseAdminAddFabParams = {
  onSelectTeam: () => void
  onSelectFacility: () => void
}

type UseAdminAddFabResult = {
  isMenuOpen: boolean
  closeMenu: () => void
  fabRef: RefObject<HTMLButtonElement | null>
  menuRef: RefObject<HTMLDivElement | null>
  fabHandlers: {
    onPointerDown: () => void
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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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

  const onPointerDown = () => triggerHaptic('light')

  const onClick = () => setIsMenuOpen((open) => !open)

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

  // レイアウト編集の行。以前のフロア編集モードは廃止したので今は何も起動しない。
  // 後から別ロジックを差し込む枠として行だけ残す
  const handleEditLayout = () => {
    // 非活性行のためno-op
  }

  return {
    isMenuOpen,
    closeMenu,
    fabRef,
    menuRef,
    fabHandlers: { onPointerDown, onClick },
    onMenuKeyDown,
    handleSelectTeam,
    handleSelectFacility,
    handleEditLayout,
  }
}
