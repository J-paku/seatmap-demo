// ヘアカラー専用の小型スウォッチ行 — 色チップを小さく敷き詰め、選択中だけ accent リングで強調
import type { CSSProperties } from 'react'
import { triggerHaptic } from '@/lib/haptic'

interface ColorSwatchRowProps {
  ariaLabel: string
  colors: string[]
  selected: string
  onSelect: (color: string) => void
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
}

// 小さくても識別できる最小サイズ。角丸 squircle で丸より洗練された印象に
const SWATCH_BASE: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 7,
  padding: 0,
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
  // 内側の細枠で淡色チップも背景から浮かせる
  boxShadow: 'inset 0 0 0 1px var(--color-border)',
  transition: 'transform 120ms ease, box-shadow 120ms ease',
}

// 選択中: surface で隙間を空けてから accent リングを重ねる
const SWATCH_SELECTED: CSSProperties = {
  boxShadow:
    'inset 0 0 0 1px var(--color-border), 0 0 0 2px var(--color-surface-sunken), 0 0 0 3.5px var(--color-accent)',
  transform: 'scale(1.12)',
}

export function ColorSwatchRow({ ariaLabel, colors, selected, onSelect }: ColorSwatchRowProps) {
  return (
    <div role='radiogroup' aria-label={ariaLabel} style={ROW_STYLE}>
      {colors.map(color => {
        const isSelected = color === selected
        return (
          <button
            key={color}
            type='button'
            role='radio'
            aria-checked={isSelected}
            aria-label={color}
            onClick={() => {
              triggerHaptic('light')
              onSelect(color)
            }}
            style={{
              ...SWATCH_BASE,
              ...(isSelected ? SWATCH_SELECTED : null),
              background: color,
            }}
          />
        )
      })}
    </div>
  )
}

export default ColorSwatchRow
