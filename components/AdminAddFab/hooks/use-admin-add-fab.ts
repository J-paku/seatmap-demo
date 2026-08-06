import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { triggerHaptic } from '@/lib/haptic'

// 長押しでの編集モード突入までの猶予(ms)
const LONG_PRESS_MS = 500
// この移動量を超えたら長押し判定を打ち切る(px)
const MOVE_THRESHOLD = 10
// メニュー項目の実体。ロービングタブの移動対象をこれで数える
const MENU_ITEM_SELECTOR = '[role=menuitem]'

export type UseAdminAddFabParams = {
  onSelectTeam: () => void
  onSelectFacility: () => void
  onEnterEdit: () => void
}

type UseAdminAddFabResult = {
  isMenuOpen: boolean
  closeMenu: () => void
  fabRef: RefObject<HTMLButtonElement | null>
  menuRef: RefObject<HTMLDivElement | null>
  fabHandlers: {
    onPointerDown: (e: ReactPointerEvent) => void
    onPointerMove: (e: ReactPointerEvent) => void
    onPointerUp: (e: ReactPointerEvent) => void
    onPointerLeave: (e: ReactPointerEvent) => void
    onClick: () => void
  }
  onMenuKeyDown: (e: ReactKeyboardEvent) => void
  handleSelectTeam: () => void
  handleSelectFacility: () => void
  handleEnterEdit: () => void
}

// スピードダイヤルの開閉と長押しだけを持つ。何を配置するかは呼び出し側が知る
export const useAdminAddFab = ({
  onSelectTeam,
  onSelectFacility,
  onEnterEdit,
}: UseAdminAddFabParams): UseAdminAddFabResult => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef({ x: 0, y: 0 })
  const longPressFiredRef = useRef(false)
  const fabRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // 一度も開いていない初回描画で FAB へ焦点を移さないための目印
  const wasMenuOpenRef = useRef(false)

  const clearPressTimer = () => {
    if (pressTimerRef.current === null) return
    clearTimeout(pressTimerRef.current)
    pressTimerRef.current = null
  }

  // アンマウント時に必ず破棄する。長押し中に画面遷移すると
  // 消えたコンポーネントが編集モードを起動してしまう
  useEffect(() => {
    return () => clearPressTimer()
  }, [])

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

  const onPointerDown = (e: ReactPointerEvent) => {
    triggerHaptic('light')
    startPosRef.current = { x: e.clientX, y: e.clientY }
    longPressFiredRef.current = false
    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null
      longPressFiredRef.current = true
      onEnterEdit()
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) clearPressTimer()
  }

  const onPointerUp = () => clearPressTimer()
  const onPointerLeave = () => clearPressTimer()

  // 長押しが成立していた直後の click は1回だけ握りつぶす。でないと
  // 編集モード突入の直後にメニューが開いてしまう
  const onClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
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

  const handleEnterEdit = () => {
    triggerHaptic('light')
    closeMenu()
    onEnterEdit()
  }

  return {
    isMenuOpen,
    closeMenu,
    fabRef,
    menuRef,
    fabHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onClick },
    onMenuKeyDown,
    handleSelectTeam,
    handleSelectFacility,
    handleEnterEdit,
  }
}
