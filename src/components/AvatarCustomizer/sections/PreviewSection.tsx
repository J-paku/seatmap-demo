// プレビューボックス
import type { CSSProperties } from 'react'
import { PixelAvatar } from '@/components/PixelAvatar'
import type { PixelAvatarConfig } from '@/types'

interface PreviewSectionProps {
  currentConfig: PixelAvatarConfig
}

// 初期スクロールを抑えるためプレビューはコンパクト化 (タイトルはモーダルヘッダーと重複するため省略)
const PREVIEW_WRAPPER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
}

const PREVIEW_BOX_STYLE: CSSProperties = {
  width: 104,
  height: 104,
  borderRadius: 16,
  background: 'var(--color-surface-sunken)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 0 0 1px var(--color-border)',
}

export function PreviewSection({ currentConfig }: PreviewSectionProps) {
  return (
    <div style={PREVIEW_WRAPPER_STYLE}>
      <div style={PREVIEW_BOX_STYLE}>
        <PixelAvatar config={currentConfig} size={92} ariaLabel='現在のアバター' />
      </div>
    </div>
  )
}
