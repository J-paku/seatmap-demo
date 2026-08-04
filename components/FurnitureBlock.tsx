import { isStructuralKind } from '@/utils/furniture-catalog'
import type { Furniture } from '@/types'

// キャンバス上の家具。会議室と違い状態も予定も持たないので、形と名前だけを描く。
// data-facility は付けない — 検証スクリプトが会議室だけを数えているため

type Props = {
  furniture: Furniture
  counterScale: number
  isEditMode: boolean
}

export const FurnitureBlock = ({ furniture, counterScale, isEditMode }: Props) => {
  const structural = isStructuralKind(furniture.kind)
  return (
    <div
      className={`furniture-block${structural ? ' is-structural' : ''}`}
      data-kind={furniture.kind}
      data-furniture-id={furniture.id}
      style={{
        left: furniture.x,
        top: furniture.y,
        width: furniture.width,
        height: furniture.height,
        // 閲覧モードでは家具に触れない。編集モードの選択はこの上に重ねる層が受ける
        pointerEvents: isEditMode ? undefined : 'none',
      }}
    >
      {!structural && furniture.name && (
        <span className='furniture-name' style={{ fontSize: 11 * counterScale }}>
          {furniture.name}
        </span>
      )}
    </div>
  )
}
