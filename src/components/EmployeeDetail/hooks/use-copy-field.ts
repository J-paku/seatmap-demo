import { useEffect, useRef, useState } from 'react'
import { writeClipboardText } from '@/lib/write-clipboard'
import type { ContactField } from '../type'
import { BUBBLE_MS } from '../utils/copy-bubble-duration'

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
    const written = writeClipboardText(value)
    if (written === null) return
    written
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
