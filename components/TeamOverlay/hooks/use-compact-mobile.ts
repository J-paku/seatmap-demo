import { useEffect, useState } from 'react'

// TeamOverlay の唯一の分岐スイッチ。pointerType やタッチ有無は見ず幅だけで決めるため、
// ウィンドウを狭めた PC も完全にモバイル表示になる
const COMPACT_MOBILE_QUERY = '(max-width: 760px)'

export const useIsCompactMobile = (): boolean => {
  // 初回レンダーは常に PC 形状。マウント後の effect で実幅へ同期する
  const [isCompactMobile, setIsCompactMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_MOBILE_QUERY)
    setIsCompactMobile(mql.matches)
    // リサイズ追従(リロード不要)
    const onChange = (e: MediaQueryListEvent) => setIsCompactMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isCompactMobile
}
