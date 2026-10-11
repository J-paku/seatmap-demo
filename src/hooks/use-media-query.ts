import { useCallback, useSyncExternalStore } from 'react'

// matchMedia は React の外にある状態なので useSyncExternalStore で購読する。
// サーバーには幅が無いので SSR 側は false(PC 形状)を返し、初回描画のちらつきを避ける
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
