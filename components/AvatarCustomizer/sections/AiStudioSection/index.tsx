// AIスタジオ — 2ボタン起点のフロー型 UI のビュー振り分け (作る → 入力 → プロンプト表示 / インポート)
import type { ChangeEvent } from 'react'
import type { AiStudioView } from '@/components/AvatarCustomizer/hooks/use-ai-studio'
import { LauncherView } from './components/LauncherView'
import { ComposeView } from './components/ComposeView'
import { PromptView } from './components/PromptView'
import { ImportView } from './components/ImportView'
import { PANEL_STYLE } from './styles'

interface AiStudioSectionProps {
  view: AiStudioView
  aiPromptText: string
  aiRequestText: string
  aiImportText: string
  canImportAiCode: boolean
  // 取り込み失敗時の具体的なフィードバック文言 (成功・未試行時は null)
  aiImportErrorMessage: string | null
  onOpenCompose: () => void
  onOpenImport: () => void
  onShowPrompt: () => void
  onGoHome: () => void
  onRequestChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onCopyPrompt: () => Promise<boolean>
  // インポート成功時に true を返す
  onImport: () => boolean
}

export function AiStudioSection({
  view,
  aiPromptText,
  aiRequestText,
  aiImportText,
  canImportAiCode,
  aiImportErrorMessage,
  onOpenCompose,
  onOpenImport,
  onShowPrompt,
  onGoHome,
  onRequestChange,
  onImportTextChange,
  onCopyPrompt,
  onImport,
}: AiStudioSectionProps) {
  return (
    <section style={PANEL_STYLE}>
      {view === 'home' && (
        <LauncherView onOpenCompose={onOpenCompose} onOpenImport={onOpenImport} />
      )}
      {view === 'compose' && (
        <ComposeView
          aiRequestText={aiRequestText}
          onRequestChange={onRequestChange}
          onShowPrompt={onShowPrompt}
          onGoHome={onGoHome}
        />
      )}
      {view === 'prompt' && (
        <PromptView
          aiPromptText={aiPromptText}
          onCopyPrompt={onCopyPrompt}
          onOpenImport={onOpenImport}
          onGoHome={onGoHome}
        />
      )}
      {view === 'import' && (
        <ImportView
          aiImportText={aiImportText}
          canImportAiCode={canImportAiCode}
          aiImportErrorMessage={aiImportErrorMessage}
          onImportTextChange={onImportTextChange}
          onImport={onImport}
          onGoHome={onGoHome}
        />
      )}
    </section>
  )
}

export default AiStudioSection
