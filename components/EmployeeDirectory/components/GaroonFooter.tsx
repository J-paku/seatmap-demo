// サイドバーフッター: 自分のアバター表示 + 設定画面への導線
import { PixelAvatar } from '@/components/PixelAvatar'
import { useMyAvatarConfig } from '@/hooks/use-my-avatar-config'
import { triggerHaptic } from '@/lib/haptic'

interface GaroonFooterProps {
  onSettingsClick: () => void
  isDark: boolean
  displayName?: string
  onAvatarClick?: () => void
}

export function GaroonFooter({
  onSettingsClick,
  isDark,
  displayName,
  onAvatarClick,
}: GaroonFooterProps) {
  const myAvatarConfig = useMyAvatarConfig()
  const subColor = isDark ? '#B8C0DD' : '#6B7280'
  return (
    <div
      className='flex h-12 shrink-0 items-center justify-between gap-2 border-t px-3'
      style={{
        borderColor: isDark ? '#374151' : '#E5E7EB',
        backgroundColor: isDark ? '#1F2230' : '#FFFFFF',
      }}
    >
      {/* 自分のアバター — 押下でアバター編集モーダルを開く */}
      <button
        type='button'
        onClick={() => {
          triggerHaptic('light')
          onAvatarClick?.()
        }}
        className='flex h-11 min-w-0 items-center gap-2 rounded-lg pr-2 transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      >
        <span
          className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full'
          style={{
            backgroundColor: 'var(--color-surface-sunken)',
            boxShadow: 'inset 0 0 0 1px var(--color-border)',
          }}
        >
          <PixelAvatar config={myAvatarConfig} size={28} ariaLabel='自分のアバター' />
        </span>
        <span className='min-w-0 truncate text-left text-sm font-semibold'>{displayName}</span>
      </button>

      <button
        type='button'
        onClick={() => {
          triggerHaptic('light')
          onSettingsClick()
        }}
        className='flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        style={{ color: subColor }}
      >
        <span className='icon-msr-filled text-base' aria-hidden='true'>
          settings
        </span>
        <span className='text-sm'>設定</span>
      </button>
    </div>
  )
}

export default GaroonFooter
