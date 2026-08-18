import { useEffect } from 'react'
import { GhostActionBar } from './components/GhostActionBar'
import { GhostAlignmentGuides } from './components/GhostAlignmentGuides'
import { GhostBlockedObstacles } from './components/GhostBlockedObstacles'
import { GhostHint } from './components/GhostHint'
import { GhostPreview } from './components/GhostPreview'
import type { GhostRequest } from './type'
import styles from './ghost-placement.module.css'
import type { GhostPlacement } from '@/hooks/use-ghost-placement/use-ghost-placement'

// ビューファインダー式ゴーストの表示層。
//
// レイヤー自身は pointer-events:none。掴める要素(枠・ハンドル・ヒント・アクションバー)だけが
// ポインタを受ける。scrim を既定の pointer-events で敷くと、キャンバスの pointerdown が
// 一切発火せずパン・ズームが完全に止まるため、暗幕にも触らせない。
// またこの層はキャンバスの DOM 木の外(SeatMapView 直下)に置く。中に入れると
// 余白クリックによる選択解除へ誤って伝播する

export type { GhostRequest } from './type'

type Props = {
  request: GhostRequest
  placement: GhostPlacement
  // 削除の確認が開いている間。バーの削除ボタンを二度押しさせない
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
  // 移動モードのときだけアクションバー左端に削除ボタンを出す(§04-4)。未指定なら出さない
  onDelete?: () => void
}

export const GhostPlacementLayer = ({ request, placement, isDeleting, onConfirm, onCancel, onDelete }: Props) => {
  const { screenRect, logicalRect, screenGuides, blocked, screenBlockedRects, isDragging, resizingHandle } = placement
  // target.type==='reposition' が「移動モード」。新規配置ではラベルバッジ・削除ボタンを出さない
  const mode = request.target.type === 'reposition' ? 'move' : 'create'

  // Esc で中止する。キャンバスやパネルの Esc より先に処理したいので捕捉フェーズで受ける
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 削除確認が開いている間は、Esc をモーダル側の取り消しに使わせる。
      // ここで食べると、ダイアログは開いたままゴーストだけが消える
      if (isDeleting) return
      e.stopPropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel, isDeleting])

  return (
    <div
      className={styles.layer}
      data-ghost='layer'
      data-mode={mode}
      data-blocked={blocked ? 'true' : 'false'}
      data-ghost-resizable={request.resizable ? 'true' : 'false'}
      data-ghost-ref={request.selfRef ? `${request.selfRef.kind}:${request.selfRef.id}` : undefined}
    >
      <div className={styles.scrim} />
      {/* 位置が実測できるまで出さないのは、位置を持つ4つだけ。
          暗幕とアクションバーはセッションが開いた時点から出す(逃げ道を常に残す) */}
      {screenRect && (
        <>
          <GhostBlockedObstacles rects={screenBlockedRects} />
          <GhostAlignmentGuides guides={screenGuides} />
          <GhostPreview
            rect={screenRect}
            logicalRect={logicalRect}
            outline={request.outline}
            blocked={blocked}
            resizable={request.resizable}
            isDragging={isDragging}
            resizingHandle={resizingHandle}
            mode={mode}
            label={request.label}
            onPointerDown={placement.onGhostPointerDown}
            onHandlePointerDown={placement.onHandlePointerDown}
          />
          <GhostHint
            rect={screenRect}
            blocked={blocked}
            isDragging={isDragging}
            onPointerDown={placement.onGhostPointerDown}
          />
        </>
      )}
      <GhostActionBar
        label={request.label}
        blocked={blocked}
        mode={mode}
        isDeleting={isDeleting}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  )
}
