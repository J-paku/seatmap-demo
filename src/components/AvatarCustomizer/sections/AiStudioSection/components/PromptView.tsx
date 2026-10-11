// prompt ビュー: 完成した指示文をそのままコピーさせる (クリックでコピー → インポートへ自動遷移)
import type { KeyboardEvent } from 'react'
import { triggerHaptic } from '@/utils/haptic'
import { StepCard } from './StepCard'
import {
  ACTION_ROW_STYLE,
  CODE_BLOCK_OVERLAY_STYLE,
  CODE_BLOCK_STYLE,
  CODE_BLOCK_WRAPPER_STYLE,
  GHOST_ACTION_STYLE,
} from '../styles'

interface PromptViewProps {
  aiPromptText: string
  onCopyPrompt: () => Promise<boolean>
  onOpenImport: () => void
  onGoHome: () => void
}

export function PromptView({
  aiPromptText,
  onCopyPrompt,
  onOpenImport,
  onGoHome,
}: PromptViewProps) {
  // コピー成功したら、そのままインポート画面へ進める (貼り付け欄に自動フォーカス)
  const handleCopyAndAdvance = async () => {
    if (await onCopyPrompt()) {
      triggerHaptic('success')
      onOpenImport()
    }
  }

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void handleCopyAndAdvance()
    }
  }

  return (
    <StepCard
      title='このまま生成AIに入力してください'
      description='下の指示文をコピーして、Geminiなどの生成AIに貼り付けてください。返ってきたテキストは「インポート」で取り込めます。'
      onGoHome={onGoHome}
    >
      <div style={CODE_BLOCK_WRAPPER_STYLE}>
        <pre
          role='button'
          tabIndex={0}
          aria-label='生成AIへの指示文をコピー'
          style={CODE_BLOCK_STYLE}
          onClick={() => {
            void handleCopyAndAdvance()
          }}
          onKeyDown={handlePromptKeyDown}
        >
          <code>{aiPromptText}</code>
        </pre>
        <span style={CODE_BLOCK_OVERLAY_STYLE}>
          <span className='icon-msr-filled' style={{ fontSize: 14 }}>
            touch_app
          </span>
          クリックでコピー → 貼り付けへ
        </span>
      </div>
      <div style={ACTION_ROW_STYLE}>
        <button
          type='button'
          style={GHOST_ACTION_STYLE}
          onClick={() => {
            triggerHaptic('light')
            onOpenImport()
          }}
        >
          <span className='icon-msr-filled' style={{ fontSize: 16 }}>
            content_paste
          </span>
          返答をインポート
        </button>
      </div>
    </StepCard>
  )
}
