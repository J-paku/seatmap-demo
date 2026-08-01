// import ビュー: 生成AIの返答を貼り付けて取り込む。失敗時は理由をインライン表示する
import type { ChangeEvent } from 'react'
import { triggerHaptic } from '@/lib/haptic'
import { useScrollIntoViewOnMount } from '../hooks/use-scroll-into-view-on-mount'
import { StepCard } from './StepCard'
import {
  ACTION_ROW_STYLE,
  IMPORT_ERROR_ICON_STYLE,
  IMPORT_ERROR_STYLE,
  IMPORT_ERROR_TEXT_STYLE,
  IMPORT_TEXTAREA_ERROR_STYLE,
  IMPORT_TEXTAREA_STYLE,
  PRIMARY_ACTION_DISABLED_STYLE,
  PRIMARY_ACTION_STYLE,
} from '../styles'

interface ImportViewProps {
  aiImportText: string
  canImportAiCode: boolean
  // 取り込み失敗時の具体的なフィードバック文言 (成功・未試行時は null)
  aiImportErrorMessage: string | null
  onImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onImport: () => boolean
  onGoHome: () => void
}

export function ImportView({
  aiImportText,
  canImportAiCode,
  aiImportErrorMessage,
  onImportTextChange,
  onImport,
  onGoHome,
}: ImportViewProps) {
  const handleImport = () => {
    // 取り込み成功時のみホームへ戻す
    if (onImport()) {
      triggerHaptic('success')
      onGoHome()
    }
  }

  const textareaRef = useScrollIntoViewOnMount()

  return (
    <StepCard
      title='生成AIの返答を貼り付け'
      description='生成AIが返したテキストをそのまま貼り付けてください。'
      onGoHome={onGoHome}
    >
      <textarea
        ref={textareaRef}
        value={aiImportText}
        onChange={onImportTextChange}
        placeholder='生成AIが返したテキストをここへ貼り付けてください'
        style={aiImportErrorMessage ? IMPORT_TEXTAREA_ERROR_STYLE : IMPORT_TEXTAREA_STYLE}
      />
      {aiImportErrorMessage && (
        <div style={IMPORT_ERROR_STYLE} role='alert'>
          <span className='icon-msr-filled' style={IMPORT_ERROR_ICON_STYLE}>
            error
          </span>
          <span style={IMPORT_ERROR_TEXT_STYLE}>{aiImportErrorMessage}</span>
        </div>
      )}
      <div style={ACTION_ROW_STYLE}>
        <button
          type='button'
          style={canImportAiCode ? PRIMARY_ACTION_STYLE : PRIMARY_ACTION_DISABLED_STYLE}
          onClick={handleImport}
          disabled={!canImportAiCode}
        >
          <span className='icon-msr-filled' style={{ fontSize: 18 }}>
            arrow_downward
          </span>
          インポート
        </button>
      </div>
    </StepCard>
  )
}

export default function _Page() {
  return null
}
