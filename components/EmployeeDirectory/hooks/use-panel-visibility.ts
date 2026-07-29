import { useEffect, useState } from 'react'
import { CLOSE_ANIMATION_MS } from '../utils/directory-constants'

// 閉じアニメーションが終わるまでマウントを維持する

type PanelVisibility = {
  isVisible: boolean
  isClosing: boolean
}

export const usePanelVisibility = (isOpen: boolean, onFullyClosed: () => void): PanelVisibility => {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  // isOpen の変化を state で追跡し、レンダー中に調整(ref を使わない React 公式パターン)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsVisible(true)
      setIsClosing(false)
    } else if (isVisible) {
      setIsClosing(true)
    }
  }

  useEffect(() => {
    if (!isClosing) return
    const id = window.setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      onFullyClosed()
    }, CLOSE_ANIMATION_MS)
    return () => window.clearTimeout(id)
  }, [isClosing, onFullyClosed])

  return { isVisible, isClosing }
}
