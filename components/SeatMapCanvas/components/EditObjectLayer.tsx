import { Fragment } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RecentPlacement } from '../type'
import { isStructuralKind } from '@/utils/furniture-catalog'
import type { Facility, Furniture, LayoutObjectRef } from '@/types'
import e from '@/components/edit/admin-edit.module.css'

// 編集モード中だけ会議室・家具の上に重ねる操作面。
//
// FacilityBlock 側へ編集分岐を書き足さないのが要点。あちらは閲覧モードでも使う共有部品なので、
// 選択・ドラッグを持ち込むと「編集用の変更が閲覧モードへ漏れる」経路が毎回できる。
// EditSeatLayer と同じく、編集時だけ現れる別レイヤーとして分離する

// 直前に置いた対象の強調枠を四辺とも外側へ広げる量(viewBox 単位)
const RECENT_FRAME_INSET = 6

type Props = {
  facilities: Facility[]
  furniture: Furniture[]
  selected: LayoutObjectRef | null
  // ゴーストで掴み直している対象。二重に見えないよう実体側を淡くする
  repositioning: LayoutObjectRef | null
  // 直前に配置・移動した対象。「戻す」チップと同じ寿命で脈動する枠を重ねる
  recent: RecentPlacement | null
  onEditPointerDown: (ref: LayoutObjectRef, e: ReactPointerEvent) => void
  // 05-3: タップ(動かさずに離した押下)で移動ゴーストを開く
  onEditTap: (ref: LayoutObjectRef) => void
}

type Box = {
  ref: LayoutObjectRef
  x: number
  y: number
  width: number
  height: number
  name: string
  // 強調枠の角丸。建設設備だけ小さい
  radius: number
}

export const EditObjectLayer = ({
  facilities,
  furniture,
  selected,
  repositioning,
  recent,
  onEditPointerDown,
  onEditTap,
}: Props) => {
  const boxes: Box[] = [
    ...facilities.map((f) => ({
      ref: { kind: 'facility' as const, id: f.id },
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      name: f.name,
      radius: 11,
    })),
    ...furniture.map((f) => ({
      ref: { kind: 'furniture' as const, id: f.id },
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      name: f.name,
      radius: isStructuralKind(f.kind) ? 5 : 11,
    })),
  ]

  // 同じ矩形の家具を重ねて置ける(家具同士の重なりは許可)ので、一致は末尾側=新しい方を採る
  const isRecentBox = (box: Box): boolean =>
    recent !== null &&
    box.ref.kind === recent.kind &&
    box.x === recent.rect.x &&
    box.y === recent.rect.y &&
    box.width === recent.rect.w &&
    box.height === recent.rect.h
  const recentIndex = recent ? boxes.reduce((found, box, i) => (isRecentBox(box) ? i : found), -1) : -1

  return (
    <>
      {boxes.map((box, index) => {
        const isSelected = selected?.kind === box.ref.kind && selected.id === box.ref.id
        const isRepositioning = repositioning?.kind === box.ref.kind && repositioning.id === box.ref.id
        return (
          <Fragment key={`${box.ref.kind}:${box.ref.id}`}>
            {index === recentIndex && (
              <div
                className={e.editObjectRecent}
                style={{
                  left: box.x - RECENT_FRAME_INSET,
                  top: box.y - RECENT_FRAME_INSET,
                  width: box.width + RECENT_FRAME_INSET * 2,
                  height: box.height + RECENT_FRAME_INSET * 2,
                  borderRadius: box.radius,
                }}
                aria-hidden='true'
              />
            )}
            <div
              className={`${e.editObjectHit}${isSelected ? ` ${e.isSelected}` : ''}${isRepositioning ? ` ${e.isRepositioning}` : ''}`}
              data-edit-object={`${box.ref.kind}:${box.ref.id}`}
              role='button'
              tabIndex={-1}
              aria-label={`${box.name || 'オブジェクト'}を選択`}
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              }}
              onPointerDown={(ev) => onEditPointerDown(box.ref, ev)}
              onClick={(ev) => {
                // 余白クリック(選択解除)へは伝播させない。タップかどうかの判定はフック側が持つ
                ev.stopPropagation()
                onEditTap(box.ref)
              }}
            />
          </Fragment>
        )
      })}
    </>
  )
}
