import { useEffect } from 'react'
import { GhostActionBar } from './components/GhostActionBar'
import { GhostAlignmentGuides } from './components/GhostAlignmentGuides'
import { GhostBlockedObstacles } from './components/GhostBlockedObstacles'
import { GhostFloorBoundary } from './components/GhostFloorBoundary'
import { GhostHint } from './components/GhostHint'
import { GhostPreview } from './components/GhostPreview'
import type { GhostRequest } from './type'
import styles from './ghost-placement.module.css'
import type { GhostPlacement } from '@/hooks/use-ghost-placement'

// ビューファインダー式ゴーストの表示層。
//
// レイヤー自身は pointer-events:none。掴める要素(枠・ハンドル・アクションバー)だけが
// ポインタを受ける。scrim を既定の pointer-events で敷くと、キャンバスの pointerdown が
// 一切発火せずパン・ズームが完全に止まるため、暗幕にも触らせない。
// またこの層はキャンバスの DOM 木の外(SeatMapView 直下)に置く。中に入れると
// 余白クリックによる選択解除へ誤って伝播する

export type { GhostRequest } from './type'

type Props = {
  request: GhostRequest
  placement: GhostPlacement
  onConfirm: () => void
  onCancel: () => void
  // 移動モードのときだけアクションバー左端に削除ボタンを出す(§04-4)。未指定なら出さない
  onDelete?: () => void
}

export const GhostPlacementLayer = ({ request, placement, onConfirm, onCancel, onDelete }: Props) => {
  const { screenRect, screenGuides, blocked, blockReason, screenBlockedRects, screenFloorRect } = placement
  // target.type==='reposition' が「移動モード」。新規配置ではラベルバッジ・削除ボタンを出さない
  const mode = request.target.type === 'reposition' ? 'move' : 'create'

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
    <div className={styles.layer}>
      <div className={styles.scrim} />
      {screenFloorRect && (
        <GhostFloorBoundary rect={screenFloorRect} isBlocking={blockReason?.kind === 'outside-floor'} />
      )}
      <GhostBlockedObstacles rects={screenBlockedRects} />
      <GhostAlignmentGuides guides={screenGuides} />
      <GhostPreview
        rect={screenRect}
        outline={request.outline}
        blocked={blocked}
        resizable={request.resizable}
        mode={mode}
        label={request.label}
        onPointerDown={placement.onGhostPointerDown}
        onHandlePointerDown={placement.onHandlePointerDown}
      />
      <GhostHint rect={screenRect} blockReason={blockReason} />
      <GhostActionBar
        label={request.label}
        blocked={blocked}
        mode={mode}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  )
}
