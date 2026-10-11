// アナウンスメント・プロバイダーの状態管理ロジックを一括処理するフック
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SetStateAction } from 'react'
import { TOAST_HIDE_DELAY, normalizeAnnouncement } from '@/utils/normalize-announcement'
import type { ToastTone } from '@/utils/normalize-announcement'

export interface AnnouncementContextValue {
  message: string
  setMessage: (value: SetStateAction<string>) => void
  announce: (message: string) => void
}

export function useAnnouncementProvider() {
  const [message, setMessageState] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [toastTone, setToastTone] = useState<ToastTone>('info')
  const messageRef = useRef('')
  const hideTimerRef = useRef<number | null>(null)
  const clearTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
  }, [])

  const setMessage = useCallback(
    (value: SetStateAction<string>) => {
      const rawMessage = typeof value === 'function' ? value(messageRef.current) : value
      const normalized = normalizeAnnouncement(rawMessage)
      const nextMessage = normalized.message
      messageRef.current = nextMessage
      setMessageState(nextMessage)
      clearTimers()
      if (!nextMessage) {
        setToastVisible(false)
        return
      }
      setToastTone(normalized.tone)
      setToastMessage(nextMessage)
      setToastVisible(true)
      hideTimerRef.current = window.setTimeout(() => {
        setToastVisible(false)
      }, TOAST_HIDE_DELAY)
      clearTimerRef.current = window.setTimeout(() => {
        setToastMessage('')
      }, TOAST_HIDE_DELAY + 220)
    },
    [clearTimers]
  )

  const announce = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage)
    },
    [setMessage]
  )

  // トーストを即時に閉じる(自動消去待ちをキャンセル)
  const dismissToast = useCallback(() => {
    clearTimers()
    setToastVisible(false)
    clearTimerRef.current = window.setTimeout(() => {
      setToastMessage('')
    }, 220)
  }, [clearTimers])

  // 表示中はユーザーのタップ/クリックでトーストを閉じる
  useEffect(() => {
    if (!toastVisible) return
    const handlePointerDown = () => dismissToast()
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [toastVisible, dismissToast])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const contextValue = useMemo<AnnouncementContextValue>(
    () => ({
      message,
      setMessage,
      announce,
    }),
    [message, setMessage, announce]
  )

  return {
    contextValue,
    toastMessage,
    toastVisible,
    toastTone,
  }
}
