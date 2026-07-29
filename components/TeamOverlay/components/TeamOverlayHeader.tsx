import { hexToRgba } from '@/lib/color'

// 中身は分岐しない。上余白だけがハンドルの有無ぶん変わる

type Props = {
  teamName: string
  teamColor: string
  occupiedCount: number
  isCompactMobile: boolean
  onClose: () => void
}

// ハンドル(48px)と重ならないよう Compact だけ上余白を積む
const PADDING_TOP_COMPACT = 28
const PADDING_TOP_DESKTOP = 12

export const TeamOverlayHeader = ({ teamName, teamColor, occupiedCount, isCompactMobile, onClose }: Props) => (
  <header
    className='team-ovl-header'
    style={{
      background: `linear-gradient(120deg, ${hexToRgba(teamColor, 0.13)} 0%, var(--color-surface) 42%, var(--color-surface) 100%)`,
      paddingTop: isCompactMobile ? PADDING_TOP_COMPACT : PADDING_TOP_DESKTOP,
    }}
  >
    <span
      className='team-ovl-dot'
      style={{ background: teamColor, boxShadow: `0 0 0 5px ${hexToRgba(teamColor, 0.13)}` }}
    />
    <span className='team-ovl-title'>{teamName}</span>
    <span className='team-ovl-count' style={{ borderColor: teamColor, color: teamColor }}>
      {occupiedCount}名
    </span>
    {/* 640px 未満では CSS 側で消える(isCompactMobile とは別ブレークポイント) */}
    <button type='button' className='team-ovl-close' aria-label='閉じる' onClick={onClose}>
      <span className='material-symbols-outlined'>close</span>
    </button>
  </header>
)
