import { useCallback, useState } from 'react'
import { readStored, writeStored } from '@/lib/store-minimap-collapse'

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
