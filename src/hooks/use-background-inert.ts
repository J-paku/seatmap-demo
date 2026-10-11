import { useEffect } from 'react'
import { applyBackgroundInert, releaseBackgroundInert } from '@/utils/apply-background-inert'

export const useBackgroundInert = (active: boolean, rootId: string) => {
  useEffect(() => {
    if (!active) return
    const root = document.getElementById(rootId)
    if (!root) return
    applyBackgroundInert(root)
    return () => releaseBackgroundInert(root)
  }, [active, rootId])
}
