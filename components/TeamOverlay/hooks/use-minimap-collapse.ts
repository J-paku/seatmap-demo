import { useCallback, useState } from 'react'

// ミニマップの開閉状態。別のチームを開いても引き継ぐので localStorage に置く。
// 既定は開 — 保存値が無ければ展開状態で見せる(閉じたい場合は明示的にトグルさせる)
const STORAGE_KEY = 'seatmap::minimap-open'

const readStored = (): boolean => {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

const writeStored = (isOpen: boolean): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(isOpen))
  } catch {
    // 容量超過などは無視(開閉状態を覚えられなくても表示は続ける)
  }
}

export const useMinimapCollapse = () => {
  const [isOpen, setIsOpen] = useState(readStored)

  // 更新関数の中で保存すると StrictMode の二度呼びで書き込みも二度走る。
  // 次の値を外で決めてから setState と保存を並べる(use-edit-session.ts と同じ理由)
  const toggle = useCallback(() => {
    const next = !isOpen
    setIsOpen(next)
    writeStored(next)
  }, [isOpen])

  return { isOpen, toggle }
}
