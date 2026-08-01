// a11y 進入点（アナウンスメント + フォーカストラップ + ライブリージョンの統合管理）
import { createContext, useContext } from 'react'
import type { ReactNode, SetStateAction } from 'react'
import { useAnnouncementProvider } from './hooks/use-announcement-provider'
import { LiveRegion } from './components/LiveRegion'

interface AnnouncementContextValue {
  message: string
  setMessage: (value: SetStateAction<string>) => void
  announce: (message: string) => void
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

interface AnnouncementProviderProps {
  children: ReactNode
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const { contextValue, toastMessage, toastVisible, toastTone } = useAnnouncementProvider()

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className={[
          'fixed left-1/2 -translate-x-1/2 z-50',
          // 上部固定。完了通知(OK)を中央の「元に戻す」トーストと分離して重なりを回避
          'max-w-[75vw] sm:max-w-[min(92vw,560px)] w-full px-4',
          'transition-all duration-200 pointer-events-none',
          toastVisible && toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
        ].join(' ')}
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div
          className={[
            'rounded-xl px-4 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur-sm',
            toastTone === 'success'
              ? 'border border-emerald-200 bg-emerald-50/95 text-emerald-900'
              : '',
            toastTone === 'warning' ? 'border border-amber-200 bg-amber-50/95 text-amber-900' : '',
            toastTone === 'error' ? 'border border-red-200 bg-red-50/95 text-red-900' : '',
            toastTone === 'info' ? 'border border-slate-200 bg-white/95 text-slate-800' : '',
          ].join(' ')}
        >
          <p className='flex items-start gap-2 leading-snug'>
            <span
              aria-hidden='true'
              className={[
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                toastTone === 'success' ? 'bg-emerald-600' : '',
                toastTone === 'warning' ? 'bg-amber-600' : '',
                toastTone === 'error' ? 'bg-red-600' : '',
                toastTone === 'info' ? 'bg-slate-600' : '',
              ].join(' ')}
            >
              {toastTone === 'success' ? 'OK' : ''}
              {toastTone === 'warning' ? '!' : ''}
              {toastTone === 'error' ? 'X' : ''}
              {toastTone === 'info' ? 'i' : ''}
            </span>
            <span className='min-w-0 break-words'>{toastMessage}</span>
          </p>
        </div>
      </div>
      <LiveRegion message={contextValue.message} />
    </AnnouncementContext.Provider>
  )
}

export function useGlobalAnnouncement() {
  const context = useContext(AnnouncementContext)
  if (!context) {
    throw new Error('useGlobalAnnouncement must be used within AnnouncementProvider')
  }
  return context
}

export default AnnouncementProvider
