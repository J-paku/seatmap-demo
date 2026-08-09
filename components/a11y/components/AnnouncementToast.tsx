// アナウンスメント用トースト表示コンポーネント(状態管理は use-announcement-provider 側)
import type { ToastTone } from '@/hooks/use-announcement-provider'

interface AnnouncementToastProps {
  message: string
  tone: ToastTone
  visible: boolean
}

export function AnnouncementToast({ message, tone, visible }: AnnouncementToastProps) {
  return (
    <div
      role='status'
      aria-live='polite'
      aria-atomic='true'
      className={[
        'fixed left-1/2 -translate-x-1/2',
        // 上部固定。完了通知(OK)を中央の「元に戻す」トーストと分離して重なりを回避
        'max-w-[75vw] sm:max-w-[min(92vw,560px)] w-full px-4',
        'transition-all duration-200 pointer-events-none',
        visible && message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
      style={{ top: 'calc(env(safe-area-inset-top) + 16px)', zIndex: 'var(--z-index-toast)' }}
    >
      <div
        className={[
          'rounded-xl px-4 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm',
          tone === 'success'
            ? 'border border-emerald-200 bg-emerald-50/95 text-emerald-900'
            : '',
          tone === 'warning' ? 'border border-amber-200 bg-amber-50/95 text-amber-900' : '',
          tone === 'error' ? 'border border-red-200 bg-red-50/95 text-red-900' : '',
          tone === 'info' ? 'border border-slate-200 bg-white/95 text-slate-800' : '',
        ].join(' ')}
      >
        <p className='flex items-start gap-2 leading-snug'>
          <span
            aria-hidden='true'
            className={[
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
              tone === 'success' ? 'bg-emerald-600' : '',
              tone === 'warning' ? 'bg-amber-600' : '',
              tone === 'error' ? 'bg-red-600' : '',
              tone === 'info' ? 'bg-slate-600' : '',
            ].join(' ')}
          >
            {tone === 'success' ? 'OK' : ''}
            {tone === 'warning' ? '!' : ''}
            {tone === 'error' ? 'X' : ''}
            {tone === 'info' ? 'i' : ''}
          </span>
          <span className='min-w-0 break-words'>{message}</span>
        </p>
      </div>
    </div>
  )
}
