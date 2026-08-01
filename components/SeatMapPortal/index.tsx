// ポータルコンテンツに .seat-map-root テーマ（data-theme + .dark クラス）を伝播するラッパー
import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SeatMapPortalProps {
  children: ReactNode
}

export function SeatMapPortal({ children }: SeatMapPortalProps) {
  const [mounted, setMounted] = useState(false)
  const [themeMode, setThemeMode] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    // .seat-map-root から current テーマを読み取る
    const root = document.querySelector('.seat-map-root')
    if (root) {
      const theme = root.getAttribute('data-theme')
      setThemeMode(theme)
      setIsDark(root.classList.contains('dark'))
    }
  }, [])

  // SSR対応: マウント前は何もレンダリングしない
  if (!mounted) {
    return null
  }

  const portalContent = (
    <div
      className={`${isDark ? 'dark' : ''} seat-map-root`}
      data-theme={themeMode || undefined}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  )

  return createPortal(portalContent, document.body)
}
