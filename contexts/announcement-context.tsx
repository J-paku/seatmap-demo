// a11y 進入点(アナウンスメント状態を配布する Context + Provider。トースト描画は components/a11y 側)
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useAnnouncementProvider } from '@/hooks/use-announcement-provider'
import type { AnnouncementContextValue } from '@/hooks/use-announcement-provider'
import { AnnouncementToast } from '@/components/a11y/components/AnnouncementToast'
import { LiveRegion } from '@/components/a11y/components/LiveRegion'

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

interface AnnouncementProviderProps {
  children: ReactNode
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const { contextValue, toastMessage, toastVisible, toastTone } = useAnnouncementProvider()

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
      <AnnouncementToast message={toastMessage} tone={toastTone} visible={toastVisible} />
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
