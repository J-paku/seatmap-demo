import { useEffect, useRef, useState } from 'react'
import { AI_CANDIDATES, AI_LOADING_MS, aiIndexOf } from '../utils/ai-candidates'
import { cloneAvatar } from '../utils/clone-avatar'
import type { AvatarConfig } from '@/types'
import type { AiView } from '../type'

// AI生成モック。通信は一切せず、要望テキストのコードポイント和で固定候補から1件選ぶ

const TOAST_MS = 1400

type AiGenerator = {
  view: AiView
  requestText: string
  loadingPhase: number
  setView: (view: AiView) => void
  setRequestText: (text: string) => void
  generate: () => void
  reset: () => void
}

type Options = {
  onGenerated: (config: AvatarConfig) => void
  onToast: (message: string | null) => void
}

export const useAiGenerator = ({ onGenerated, onToast }: Options): AiGenerator => {
  const [view, setView] = useState<AiView>('home')
  const [requestText, setRequestText] = useState('')
  const [loadingPhase, setLoadingPhase] = useState(0)
  const timersRef = useRef<number[]>([])

  // 予約済みの演出タイマーを全解除
  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  // アンマウント時(モーダルを閉じた時含む)に演出タイマーを掃除
  useEffect(() => () => clearTimers(), [])

  // compose→1.5秒のローディング演出(文言2段切替)→固定候補から反映
  const generate = () => {
    if (!requestText.trim()) return
    clearTimers()
    setView('loading')
    setLoadingPhase(0)
    const t1 = window.setTimeout(() => setLoadingPhase(1), AI_LOADING_MS / 2)
    const t2 = window.setTimeout(() => {
      onGenerated(cloneAvatar(AI_CANDIDATES[aiIndexOf(requestText)]))
      setView('home')
      onToast('生成しました')
      const t3 = window.setTimeout(() => onToast(null), TOAST_MS)
      timersRef.current.push(t3)
    }, AI_LOADING_MS)
    timersRef.current.push(t1, t2)
  }

  const reset = () => {
    setRequestText('')
    clearTimers()
    setView('home')
  }

  return { view, requestText, loadingPhase, setView, setRequestText, generate, reset }
}
