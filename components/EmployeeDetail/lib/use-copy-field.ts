import { useEffect, useRef, useState } from 'react'
import type { ContactField } from '../type'

// コピー成功の吹き出しを出す時間
const BUBBLE_MS = 1600

type CopyField = {
  copiedField: ContactField | null
  copy: (field: ContactField, value: string) => void
}

export const useCopyField = (): CopyField => {
  const [copiedField, setCopiedField] = useState<ContactField | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  const copy = (field: ContactField, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(field)
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => setCopiedField(null), BUBBLE_MS)
      })
      .catch(() => {
        // 失敗時は静かに無視(スペック指定)
      })
  }

  return { copiedField, copy }
}
