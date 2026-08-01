// アバターパーツの選択チップ — 48x48 角丸、選択時にコーラル枠で強調
import type { CSSProperties, ReactNode } from 'react'
import { triggerHaptic } from '@/lib/haptic'

interface PartPreviewChipProps {
  isSelected: boolean
  ariaLabel: string
  children: ReactNode
  onClick: () => void
}

const BASE_STYLE: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  background: 'var(--color-surface-elevated)',
  transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  padding: 4,
}

export function PartPreviewChip({
  isSelected,
  ariaLabel,
  children,
  onClick,
}: PartPreviewChipProps) {
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={() => {
        triggerHaptic('light')
        onClick()
      }}
      style={{
        ...BASE_STYLE,
        border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
        boxShadow: isSelected ? '0 0 0 3px var(--color-accent-soft)' : 'var(--shadow-card)',
        transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  )
}

export default PartPreviewChip
