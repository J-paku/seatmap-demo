// AIスタジオ各ステップ共通シェル — 戻るボタン + タイトル + 説明 + 本文 (compose/prompt/import で共有)
import type { ReactNode } from 'react'
import { triggerHaptic } from '@/utils/haptic'
import {
  BACK_BUTTON_STYLE,
  STEP_CARD_STYLE,
  STEP_DESCRIPTION_STYLE,
  STEP_HEADER_STYLE,
  STEP_TITLE_STYLE,
} from '../styles'

interface StepCardProps {
  title: string
  description: string
  onGoHome: () => void
  children: ReactNode
}

export function StepCard({ title, description, onGoHome, children }: StepCardProps) {
  return (
    <div style={STEP_CARD_STYLE}>
      <div style={STEP_HEADER_STYLE}>
        <button
          type='button'
          aria-label='戻る'
          style={BACK_BUTTON_STYLE}
          onClick={() => {
            triggerHaptic('light')
            onGoHome()
          }}
        >
          <span className='icon-msr-filled' style={{ fontSize: 18 }}>
            arrow_back
          </span>
        </button>
        <span style={STEP_TITLE_STYLE}>{title}</span>
      </div>
      <p style={STEP_DESCRIPTION_STYLE}>{description}</p>
      {children}
    </div>
  )
}
