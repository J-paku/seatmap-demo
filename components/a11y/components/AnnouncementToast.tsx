// アナウンスメント用トースト表示コンポーネント(状態管理は use-announcement-provider 側)
import type { CSSProperties } from 'react'
import type { ToastTone } from '@/hooks/use-announcement-provider'
import styles from '../announcement-toast.module.css'

interface AnnouncementToastProps {
  message: string
  tone: ToastTone
  visible: boolean
}

// トーン別の見出しアイコンと色。色は必ずトークン経由で取る(docs/styling.md 2.)
const TONE: Record<ToastTone, { icon: string; color: string }> = {
  success: { icon: 'check_circle', color: 'var(--color-success)' },
  warning: { icon: 'warning', color: 'var(--color-warning)' },
  error: { icon: 'error', color: 'var(--color-danger)' },
  info: { icon: 'info', color: 'var(--color-accent)' },
}

export function AnnouncementToast({ message, tone, visible }: AnnouncementToastProps) {
  const { icon, color } = TONE[tone]

  return (
    <div
      role='status'
      aria-live='polite'
      aria-atomic='true'
      className={[
        'fixed left-1/2 -translate-x-1/2 flex justify-center',
        // 上部固定。完了通知を中央の「元に戻す」トーストと分離して重なりを回避
        'max-w-[min(92vw,560px)] px-4',
        'transition-all duration-200 pointer-events-none',
        visible && message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
      style={{ top: 'calc(env(safe-area-inset-top) + 16px)', zIndex: 'var(--z-index-toast)' }}
    >
      {/* 内容幅のピル。地・枠線はトーン色をガラスに薄く混ぜて出す */}
      <p
        className={`${styles.toast} liquid-glass inline-flex items-center gap-2 rounded-full py-2.5 pl-3.5 pr-5 text-sm font-medium leading-snug text-[color:var(--color-text-primary)]`}
        style={{ ['--tone-color' as string]: color } as CSSProperties}
      >
        <span className={`${styles.icon} material-symbols-outlined`} aria-hidden='true'>
          {icon}
        </span>
        <span className='min-w-0 break-words'>{message}</span>
      </p>
    </div>
  )
}
