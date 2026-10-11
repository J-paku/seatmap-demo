import { useLongPress } from '@/hooks/use-long-press'
import { isStructuralKind } from '@/utils/furniture-catalog'
import type { Furniture } from '@/types'
import styles from './seatmap.module.css'

// キャンバス上の家具。会議室と違い状態も予定も持たないので、形と名前だけを描く。
// data-facility は付けない — 検証スクリプトが会議室だけを数えているため

type Props = {
  furniture: Furniture
  counterScale: number
  // 05-1: 閲覧モードで管理者が家具を長押しすると編集セッションへ入る。
  // 渡されないときはポインタを一切受けない(従来どおり素通りさせる)
  onLongPressEditSession?: () => void
}

// 家具自体はポインタを受けない。編集モードの選択・ドラッグは上に重ねる EditObjectLayer が担う。
// 例外は §05-1 の長押し進入だけで、その時も click は握らずキャンバスへ通す
export const FurnitureBlock = ({ furniture, counterScale, onLongPressEditSession }: Props) => {
  const structural = isStructuralKind(furniture.kind)
  // 05-1: しきい値(500ms / 10px)は +FAB・チーム枠と同じフックを共有する
  const longPress = useLongPress({ onLongPress: () => onLongPressEditSession?.() })
  const canLongPress = onLongPressEditSession !== undefined
  return (
    <div
      className={`furniture-block${structural ? ' is-structural' : ''}`}
      data-kind={furniture.kind}
      data-furniture-id={furniture.id}
      onPointerDown={canLongPress ? longPress.handlers.onPointerDown : undefined}
      onPointerMove={canLongPress ? longPress.handlers.onPointerMove : undefined}
      onPointerUp={canLongPress ? longPress.handlers.onPointerUp : undefined}
      onPointerLeave={canLongPress ? longPress.handlers.onPointerLeave : undefined}
      onPointerCancel={canLongPress ? longPress.handlers.onPointerCancel : undefined}
      style={{
        left: furniture.x,
        top: furniture.y,
        width: furniture.width,
        height: furniture.height,
        pointerEvents: canLongPress ? 'auto' : 'none',
      }}
    >
      {/* 05-3: ラベル表示トグル。未指定は表示(既定値の穴埋めは lib/layout-persistence が持つ) */}
      {!structural && furniture.name && furniture.labelVisible !== false && (
        <span className={styles.furnitureName} style={{ fontSize: 11 * counterScale }}>
          {furniture.name}
        </span>
      )}
    </div>
  )
}
