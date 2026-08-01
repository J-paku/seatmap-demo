// マウント時に入力欄を表示領域へスムーズスクロールするフック（focus は呼ばずキーボードを誘発しない）
import { useEffect, useRef } from 'react'

export const useScrollIntoViewOnMount = () => {
  const ref = useRef<HTMLTextAreaElement>(null)
  // ビュー切替直後に入力欄が隠れている場合に備え、見える位置までスクロール（focus は呼ばないためキーボードは出さない）
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])
  return ref
}

export default function _Page() {
  return null
}
