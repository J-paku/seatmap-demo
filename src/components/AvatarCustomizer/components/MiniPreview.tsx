// アバター設定プレビュー表示コンポーネント — 40x40 PixelAvatar 描画
import { PixelAvatar } from '@/components/PixelAvatar'
import type { PartsAvatarConfig } from '@/types'

interface MiniPreviewProps {
  config: PartsAvatarConfig
}

export function MiniPreview({ config }: MiniPreviewProps) {
  return <PixelAvatar config={config} size={40} />
}
