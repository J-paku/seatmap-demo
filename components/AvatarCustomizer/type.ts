import type { AvatarConfig } from '@/lib/types'

// クイックスタートのプリセット
export type AvatarPreset = {
  id: string
  label: string
  config: AvatarConfig
}

// AIスタジオのステップ('home'=CTAのみ / 'compose'=入力 / 'loading'=演出中)
export type AiView = 'home' | 'compose' | 'loading'

export type AvatarCustomizerModalProps = {
  initial: AvatarConfig
  onSave: (config: AvatarConfig) => void
  onClose: () => void
}
