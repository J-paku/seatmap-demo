// キャンセル/リセット/保存ボタン
import type { CSSProperties } from 'react'
import { triggerHaptic } from '@/utils/haptic'

interface ActionsSectionProps {
  handleReset: () => void
  handleSave: () => void
  // フッター埋め込み時: ボタンをコンパクトサイズに
  compact?: boolean
}

const ACTIONS_STYLE: CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
}

const ACTION_BTN_BASE: CSSProperties = {
  minHeight: 40,
  padding: '0 16px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid transparent',
}

const ACTION_BTN_COMPACT: CSSProperties = {
  ...ACTION_BTN_BASE,
  minHeight: 34,
  padding: '0 12px',
  fontSize: 12,
  borderRadius: 8,
}

export function ActionsSection({
  handleReset,
  handleSave,
  compact = false,
}: ActionsSectionProps) {
  const btnBase = compact ? ACTION_BTN_COMPACT : ACTION_BTN_BASE
  return (
    <div style={ACTIONS_STYLE}>
      <button
        type='button'
        onClick={() => {
          triggerHaptic('medium')
          handleReset()
        }}
        style={{
          ...btnBase,
          background: 'var(--color-surface-muted)',
          color: 'var(--color-text-primary)',
        }}
      >
        リセット
      </button>
      <button
        type='button'
        onClick={() => {
          triggerHaptic('success')
          handleSave()
        }}
        style={{
          ...btnBase,
          background: 'var(--color-accent)',
          color: 'var(--color-text-on-accent)',
        }}
      >
        保存
      </button>
    </div>
  )
}
