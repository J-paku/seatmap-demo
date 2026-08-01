// PixelAvatar の共有アバターコンテキスト — IndexedDB + SWR の全社員アバターを Map 化して配布する
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAvatars } from '@/hooks/use-avatars'
import type { PixelAvatarConfig, StoredAvatarRecord } from '@/types'

interface AvatarsContextValue {
  avatarConfigByOwnerCode: Map<string, PixelAvatarConfig>
  isInitialLoading: boolean
  refreshAvatarFor: (ownerCode: string) => Promise<void>
  upsertLocalAvatar: (record: StoredAvatarRecord) => Promise<void>
}

interface AvatarsProviderProps {
  children: ReactNode
}

const EMPTY_AVATAR_CONFIG_MAP = new Map<string, PixelAvatarConfig>()

const DEFAULT_VALUE: AvatarsContextValue = {
  avatarConfigByOwnerCode: EMPTY_AVATAR_CONFIG_MAP,
  isInitialLoading: false,
  refreshAvatarFor: async () => {},
  upsertLocalAvatar: async () => {},
}

const AvatarsContext = createContext<AvatarsContextValue>(DEFAULT_VALUE)

export function AvatarsProvider({ children }: AvatarsProviderProps) {
  const { avatars, isInitialLoading, refreshAvatarFor, upsertLocalAvatar } = useAvatars()

  const avatarConfigByOwnerCode = useMemo(
    () =>
      new Map(
        avatars.map(
          record => [record.ownerCode, record.config] satisfies [string, PixelAvatarConfig]
        )
      ),
    [avatars]
  )

  const value = useMemo(
    () => ({
      avatarConfigByOwnerCode,
      isInitialLoading,
      refreshAvatarFor,
      upsertLocalAvatar,
    }),
    [avatarConfigByOwnerCode, isInitialLoading, refreshAvatarFor, upsertLocalAvatar]
  )

  return <AvatarsContext.Provider value={value}>{children}</AvatarsContext.Provider>
}

export const useSharedAvatars = (): AvatarsContextValue => useContext(AvatarsContext)
