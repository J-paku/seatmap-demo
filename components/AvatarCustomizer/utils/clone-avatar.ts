import type { AvatarConfig } from '@/types'

// アバターの不変クローン(palette までコピー)
export const cloneAvatar = (a: AvatarConfig): AvatarConfig => ({ ...a, palette: { ...a.palette } })
