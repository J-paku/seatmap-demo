// アナウンスメント・プロバイダーの状態管理ロジックを一括処理するフック
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SetStateAction } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface AnnouncementContextValue {
  message: string
  setMessage: (value: SetStateAction<string>) => void
  announce: (message: string) => void
}

const TOAST_HIDE_DELAY = 2600

function normalizeAnnouncement(rawMessage: string): { message: string; tone: ToastTone } {
  const trimmed = rawMessage.trim()
  if (!trimmed) {
    return { message: '', tone: 'info' }
  }

  const tagMatch = trimmed.match(/^\[(success|warning|error|info)\]\s*/i)
  if (tagMatch) {
    const tone = tagMatch[1].toLowerCase() as ToastTone
    const message = trimmed.replace(/^\[(success|warning|error|info)\]\s*/i, '')
    return { message, tone }
  }

  const errorKeywords = [
    'できません',
    '失敗',
    'エラー',
    '重な',
    '狭すぎ',
    'オフライン',
    '権限がない',
    '確認してください',
    'エリア外',
  ]
  if (errorKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'error' }
  }

  const warningKeywords = ['選択してください', 'ありません', '解除しました']
  if (warningKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'warning' }
  }

  const successKeywords = [
    '追加しました',
    '削除しました',
    '変更しました',
    '入れ替えました',
    '挿入しました',
    '移動しました',
    '選択しました',
  ]
  if (successKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'success' }
  }

  return { message: trimmed, tone: 'info' }
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
