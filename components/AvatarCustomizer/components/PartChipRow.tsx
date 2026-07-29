import { PixelAvatar } from '@/components/PixelAvatar'
import type { AvatarConfig } from '@/types'

// ミニプレビュー付きのパーツチップ行

type Props<T extends string> = {
  label: string
  options: T[]
  current: T
  render: (opt: T) => AvatarConfig
  onPick: (opt: T) => void
}

export const PartChipRow = <T extends string>({ label, options, current, render, onPick }: Props<T>) => (
  <div className='ac-part-row'>
    <span className='ac-part-label'>{label}</span>
    <div className='ac-chip-scroll'>
      {options.map((opt) => (
        <button
          key={opt}
          type='button'
          className={`ac-chip${opt === current ? ' is-selected' : ''}`}
          aria-pressed={opt === current}
          aria-label={opt}
          onClick={() => onPick(opt)}
        >
          <PixelAvatar config={render(opt)} size={40} />
        </button>
      ))}
    </div>
  </div>
)
