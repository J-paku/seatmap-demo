import { isStructuralKind } from '@/utils/furniture-catalog'
import type { Furniture } from '@/types'

// キャンバス上の家具。会議室と違い状態も予定も持たないので、形と名前だけを描く。
// data-facility は付けない — 検証スクリプトが会議室だけを数えているため

type Props = {
  furniture: Furniture
  counterScale: number
}

// 家具自体はポインタを受けない。編集モードの選択・ドラッグは上に重ねる EditObjectLayer が担う
export const FurnitureBlock = ({ furniture, counterScale }: Props) => {
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
        pointerEvents: 'none',
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
