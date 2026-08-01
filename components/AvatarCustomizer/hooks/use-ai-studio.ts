// AIスタジオのビュー遷移管理 — 2ボタン起点フロー (home → compose → prompt / import)
import { useCallback, useState } from 'react'

// home: 2ボタンランチャー / compose: 要望入力 / prompt: 完成プロンプト表示 / import: 応答貼り付け
export type AiStudioView = 'home' | 'compose' | 'prompt' | 'import'

interface UseAiStudioResult {
  view: AiStudioView
  openCompose: () => void
  openImport: () => void
  showPrompt: () => void
  goHome: () => void
}

export const useAiStudio = (): UseAiStudioResult => {
  const [view, setView] = useState<AiStudioView>('home')

  const openCompose = useCallback(() => {
    setView('compose')
  }, [])
  const openImport = useCallback(() => {
    setView('import')
  }, [])
  const showPrompt = useCallback(() => {
    setView('prompt')
  }, [])
  const goHome = useCallback(() => {
    setView('home')
  }, [])

  return { view, openCompose, openImport, showPrompt, goHome }
}
