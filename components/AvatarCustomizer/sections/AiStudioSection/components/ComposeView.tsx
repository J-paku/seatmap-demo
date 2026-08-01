// compose ビュー: ChatGPT のメイン入力画面のような要望入力
import type { ChangeEvent } from 'react'
import { triggerHaptic } from '@/lib/haptic'
import { useScrollIntoViewOnMount } from '../hooks/use-scroll-into-view-on-mount'
import { StepCard } from './StepCard'
import {
  ACTION_ROW_STYLE,
  COMPOSE_TEXTAREA_STYLE,
  PRIMARY_ACTION_DISABLED_STYLE,
  PRIMARY_ACTION_STYLE,
} from '../styles'

interface ComposeViewProps {
  aiRequestText: string
  onRequestChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onShowPrompt: () => void
  onGoHome: () => void
}

export function ComposeView({
  aiRequestText,
  onRequestChange,
  onShowPrompt,
  onGoHome,
}: ComposeViewProps) {
  const canSubmit = aiRequestText.trim().length > 0
  const textareaRef = useScrollIntoViewOnMount()
  return (
    <StepCard
      title='どんなキャラクターにしたいですか？'
      description='雰囲気・髪型・表情・服の色など、思いついたまま書いてください。次の画面で生成AIに渡す指示文に変換します。'
      onGoHome={onGoHome}
    >
      <textarea
        ref={textareaRef}
        value={aiRequestText}
        onChange={onRequestChange}
        placeholder='ここに希望するアバターの雰囲気・髪型・表情などを直接書いてください'
        style={COMPOSE_TEXTAREA_STYLE}
      />
      <div style={ACTION_ROW_STYLE}>
        <button
          type='button'
          style={canSubmit ? PRIMARY_ACTION_STYLE : PRIMARY_ACTION_DISABLED_STYLE}
          onClick={() => {
            triggerHaptic('medium')
            onShowPrompt()
          }}
          disabled={!canSubmit}
        >
          指示文を作る
          <span className='icon-msr-filled' style={{ fontSize: 18 }}>
            arrow_forward
          </span>
        </button>
      </div>
    </StepCard>
  )
}
