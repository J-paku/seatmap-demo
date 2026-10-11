// フォーカストラップの DOM 副作用を担うフック（§2準拠）
// アルゴリズムの実体は hooks/use-focus-trap.ts に一本化する。
// ルート実装は offsetParent による可視要素フィルタを持ち、原文の実装の上位集合になっている
import { useRef } from 'react'
import { useFocusTrap as useFocusTrapWithin } from '@/hooks/use-focus-trap'

// Tab/Shift+Tab がモーダル境界を越えないようにする
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrapWithin(isActive, containerRef)
  return { containerRef }
}
