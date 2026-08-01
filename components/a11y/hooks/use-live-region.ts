// ライブリージョン DOM 副作用を担うフック（§6準拠）
import { useEffect, useRef } from 'react'

export function useLiveRegion(message: string) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    // 一旦クリアしてから設定することでスクリーンリーダーが変化を検知できるようにする
    ref.current.textContent = ''
    if (!message) return
    const timer = setTimeout(() => {
      if (ref.current) {
        ref.current.textContent = message
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [message])

  return { ref }
}
