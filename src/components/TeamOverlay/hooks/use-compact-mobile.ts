import { useCallback, useSyncExternalStore } from 'react'
import { COMPACT_MOBILE_QUERY } from '../utils/match-compact-mobile'

// matchMedia は React の外にある状態なので useSyncExternalStore で購読する。
// 以前は useState + useEffect で「初回は必ず PC 形状 → マウント後に実幅へ差し替え」だったため、
// モバイルでは初回ペイントが PC 形状になり一瞬ちらついていた
export const useIsCompactMobile = (): boolean => {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mql = window.matchMedia(COMPACT_MOBILE_QUERY)
    mql.addEventListener('change', onStoreChange)
    return () => mql.removeEventListener('change', onStoreChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_MOBILE_QUERY).matches,
    // サーバーには幅が無い。SSR 出力と初回クライアント出力を揃えるため PC 形状を返す
    () => false
  )
}
