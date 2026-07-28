import { useEffect } from 'react'

// 参照カウント式の body スクロールロック(パネル入れ子時は最後の1枚が閉じるときのみ復元)
let lockCount = 0
let prevOverflow = ''

export const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount++
    return () => {
      lockCount--
      if (lockCount === 0) document.body.style.overflow = prevOverflow
    }
  }, [active])
}
