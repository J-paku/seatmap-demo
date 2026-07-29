import type { AvatarConfig } from '@/lib/types'

// アバターの不変クローン(palette までコピー)
export const cloneAvatar = (a: AvatarConfig): AvatarConfig => ({ ...a, palette: { ...a.palette } })
