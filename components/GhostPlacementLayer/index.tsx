import { useEffect } from 'react'
import { GhostActionBar } from './components/GhostActionBar'
import { GhostAlignmentGuides } from './components/GhostAlignmentGuides'
import { GhostHint } from './components/GhostHint'
import { GhostPreview } from './components/GhostPreview'
import type { GhostRequest } from './type'
import type { GhostPlacement } from '@/hooks/use-ghost-placement'

// ビューファインダー式ゴーストの表示層。
//
// レイヤー自身は pointer-events:none。掴める要素(枠・ハンドル・アクションバー)だけが
// ポインタを受ける。scrim を既定の pointer-events で敷くと、キャンバスの pointerdown が
// 一切発火せずパン・ズームが完全に止まるため、暗幕にも触らせない。
// またこの層はキャンバスの DOM 木の外(SeatMapView 直下)に置く。中に入れると
// 余白クリックによる選択解除へ誤って伝播する

export type { GhostRequest, GhostTarget } from './type'

type Props = {
  request: GhostRequest
  placement: GhostPlacement
  onConfirm: () => void
  onCancel: () => void
}

export const GhostPlacementLayer = ({ request, placement, onConfirm, onCancel }: Props) => {
  const { screenRect, screenGuides, blocked } = placement

  // Esc で中止する。キャンバスやパネルの Esc より先に処理したいので捕捉フェーズで受ける
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel])

  if (!screenRect) return null

  return (
    <div className='ghost-layer'>
      <div className='ghost-scrim' />
      <GhostAlignmentGuides guides={screenGuides} />
      <GhostPreview
        rect={screenRect}
        outline={request.outline}
        blocked={blocked}
        resizable={request.resizable}
        label={request.label}
        onPointerDown={placement.onGhostPointerDown}
        onHandlePointerDown={placement.onHandlePointerDown}
      />
      <GhostHint rect={screenRect} blocked={blocked} />
      <GhostActionBar label={request.label} blocked={blocked} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  )
}
