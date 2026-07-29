import { PixelAvatar } from '@/components/PixelAvatar'
import { PRESETS } from '../utils/avatar-options'
import type { AvatarConfig } from '@/lib/types'

// 大きなプレビューと、クイックスタートのプリセットチップ

type Props = {
  draft: AvatarConfig
  activePresetId: string | null
  onApplyPreset: (config: AvatarConfig) => void
}

export const AvatarPreview = ({ draft, activePresetId, onApplyPreset }: Props) => (
  <>
    <div className='ac-preview'>
      <PixelAvatar config={draft} size={140} />
    </div>

    <div className='ac-quickstart'>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type='button'
          className={`ac-preset-chip${activePresetId === p.id ? ' is-selected' : ''}`}
          aria-pressed={activePresetId === p.id}
          onClick={() => onApplyPreset(p.config)}
        >
          <PixelAvatar config={p.config} size={32} />
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  </>
)
