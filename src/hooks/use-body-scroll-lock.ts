import { useEffect } from 'react'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/body-scroll-lock'

// 参照カウントの実体は utils/body-scroll-lock.ts に一本化する。
// カウンタを2つ持つと、片方でロックし他方で解除したときに overflow の復元が壊れる
export const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [active])
}
