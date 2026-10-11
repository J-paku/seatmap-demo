// AI生成プロンプトの状態管理 — 要望テキスト入力・プロンプト組み立て・クリップボードコピー
import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useGlobalAnnouncement } from '@/contexts/announcement-context'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import { buildAiPromptText } from '../utils/avatar-prompt-builder'

interface UseAiPromptResult {
  aiRequestText: string
  // プレビュー・コピーに使う完成プロンプト本文
  aiPromptText: string
  handleAiRequestChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  // コピー成功時に true を返す (呼び出し側でインポート画面へ自動遷移するため)
  handleCopyAiPrompt: () => Promise<boolean>
  resetRequest: () => void
}

export const useAiPrompt = (): UseAiPromptResult => {
  const { setMessage: setGlobalAnnouncement } = useGlobalAnnouncement()
  // ユーザーが書く「要望」テキスト — プロンプト本文の要望欄に差し込む
  const [aiRequestText, setAiRequestText] = useState('')

  const aiPromptText = useMemo(() => buildAiPromptText(aiRequestText), [aiRequestText])

  const handleAiRequestChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setAiRequestText(event.target.value)
  }, [])

  const handleCopyAiPrompt = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setGlobalAnnouncement(`[error]${TOAST_MESSAGES.COPY_FAILED}`)
      return false
    }

    try {
      await navigator.clipboard.writeText(aiPromptText)
      setGlobalAnnouncement(`[success]${TOAST_MESSAGES.COPY_SUCCESS}`)
      return true
    } catch {
      setGlobalAnnouncement(`[error]${TOAST_MESSAGES.COPY_FAILED}`)
      return false
    }
  }, [aiPromptText, setGlobalAnnouncement])

  const resetRequest = useCallback(() => {
    setAiRequestText('')
  }, [])

  return {
    aiRequestText,
    aiPromptText,
    handleAiRequestChange,
    handleCopyAiPrompt,
    resetRequest,
  }
}
