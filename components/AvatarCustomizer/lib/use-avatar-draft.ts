import { useMemo, useState } from 'react'
import { cloneAvatar } from '../utils/clone-avatar'
import { matchPresetId } from '../utils/avatar-options'
import type { AvatarConfig } from '@/lib/types'

// 編集中のアバター(draft)とパーツ・色の差し替え口

type AvatarDraft = {
  draft: AvatarConfig
  activePresetId: string | null
  setHair: (hair: AvatarConfig['hair']) => void
  setFace: (face: AvatarConfig['face']) => void
  setOutfit: (outfit: AvatarConfig['outfit']) => void
  setHairColor: (hair: string) => void
  setSkinColor: (skin: string) => void
  setOutfitColor: (outfit: string) => void
  applyConfig: (config: AvatarConfig) => void
}

export const useAvatarDraft = (initial: AvatarConfig): AvatarDraft => {
  const [draft, setDraft] = useState<AvatarConfig>(() => cloneAvatar(initial))

  return {
    draft,
    activePresetId: useMemo(() => matchPresetId(draft), [draft]),
    setHair: (hair) => setDraft((d) => ({ ...d, hair })),
    setFace: (face) => setDraft((d) => ({ ...d, face })),
    setOutfit: (outfit) => setDraft((d) => ({ ...d, outfit })),
    setHairColor: (hair) => setDraft((d) => ({ ...d, palette: { ...d.palette, hair } })),
    setSkinColor: (skin) => setDraft((d) => ({ ...d, palette: { ...d.palette, skin } })),
    setOutfitColor: (outfit) => setDraft((d) => ({ ...d, palette: { ...d.palette, outfit } })),
    applyConfig: (config) => setDraft(cloneAvatar(config)),
  }
}
