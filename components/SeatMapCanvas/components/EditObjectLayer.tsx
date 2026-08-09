import type { PointerEvent as ReactPointerEvent } from 'react'
import type { LivePosition } from '../type'
import type { Facility, Furniture, LayoutObjectRef } from '@/types'
import e from '@/components/edit/admin-edit.module.css'

// 編集モード中だけ会議室・家具の上に重ねる操作面。
//
// FacilityBlock 側へ編集分岐を書き足さないのが要点。あちらは閲覧モードでも使う共有部品なので、
// 選択・ドラッグを持ち込むと「編集用の変更が閲覧モードへ漏れる」経路が毎回できる。
// EditSeatLayer と同じく、編集時だけ現れる別レイヤーとして分離する

type Props = {
  facilities: Facility[]
  furniture: Furniture[]
  selected: LayoutObjectRef | null
  // ゴーストで掴み直している対象。二重に見えないよう実体側を淡くする
  repositioning: LayoutObjectRef | null
  livePos: LivePosition | null
  onEditPointerDown: (ref: LayoutObjectRef, e: ReactPointerEvent) => void
}

type Box = { ref: LayoutObjectRef; x: number; y: number; width: number; height: number; name: string }

export const EditObjectLayer = ({ facilities, furniture, selected, repositioning, livePos, onEditPointerDown }: Props) => {
  const boxes: Box[] = [
    ...facilities.map((f) => ({
      ref: { kind: 'facility' as const, id: f.id },
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      name: f.name,
    })),
    ...furniture.map((f) => ({
      ref: { kind: 'furniture' as const, id: f.id },
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      name: f.name,
    })),
  ]

  return (
    <>
      {boxes.map((box) => {
        const isSelected = selected?.kind === box.ref.kind && selected.id === box.ref.id
        const isRepositioning = repositioning?.kind === box.ref.kind && repositioning.id === box.ref.id
        const live = livePos && livePos.id === box.ref.id ? livePos : null
        return (
          <div
            key={`${box.ref.kind}:${box.ref.id}`}
            className={`${e.editObjectHit}${isSelected ? ` ${e.isSelected}` : ''}${isRepositioning ? ` ${e.isRepositioning}` : ''}`}
            data-edit-object={`${box.ref.kind}:${box.ref.id}`}
            role='button'
            tabIndex={-1}
            aria-label={`${box.name || 'オブジェクト'}を選択`}
            style={{
              left: live ? live.x : box.x,
              top: live ? live.y : box.y,
              width: box.width,
              height: box.height,
            }}
            onPointerDown={(e) => onEditPointerDown(box.ref, e)}
            onClick={(e) => e.stopPropagation()}
          />
        )
      })}
    </>
  )
}
