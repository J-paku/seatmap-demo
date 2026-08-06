import { useCallback, useState } from 'react'

type IosOnlyNotice = {
  isOpen: boolean
  open: () => void
  close: () => void
}

// 実物は isIOS の時だけ電話帳ボタンを出す。デモは機能の存在を見せるため常に出し、
// 押されたらiOS専用である旨の案内を開く
export const useIosOnlyNotice = (): IosOnlyNotice => {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, open, close }
}
