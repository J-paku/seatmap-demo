// レイアウト上のオブジェクトを種別横断で引く唯一の入口。
//
// 「当たり判定と吸着の対象に何が含まれるか」はもともと layout-rules に3つ・sibling-rects に2つ、
// 計5箇所へ手書きで散っていた。種別が増えたときこの5箇所を全て直さないと、新種別だけが
// 素通りするのに型エラーは出ない — 無言で壊れる。下の switch に集約し、
// 種別を足したら case 不足でコンパイルが落ちるようにして取りこぼしを型で塞ぐ。
//
// ここが答えるのは「どこに何があるか」だけ。ぶつかった時に何が起きるか(座席同士は入れ替え、
// 会議室とは拒否、チームエリア内は所属変更)はポリシーなので layout-rules 側に残す
import { rectOf } from './rect'
import type { Rect } from './rect'
import type { LayoutObjectKind, LayoutObjectRef, SeatLayout, Team } from '@/types'

export type LayoutObjectEntry = { id: string; rect: Rect }

const areaRect = (area: Team['area']): Rect => ({ x: area.x, y: area.y, w: area.w, h: area.h })

const entriesOfKind = (layout: SeatLayout, kind: LayoutObjectKind): LayoutObjectEntry[] => {
  switch (kind) {
    case 'seat':
      return layout.seats.map((s) => ({ id: s.id, rect: rectOf(s) }))
    case 'team':
      return layout.teams.map((t) => ({ id: t.id, rect: areaRect(t.area) }))
    case 'facility':
      return layout.facilities.map((f) => ({ id: f.id, rect: rectOf(f) }))
    case 'furniture':
      return layout.furniture.map((f) => ({ id: f.id, rect: rectOf(f) }))
    default: {
      // 種別を足してここに case を書き忘れると、この代入がコンパイルエラーになる
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

// 指定した種別群の矩形を集める。except に一致するものだけ除く(移動中の自分自身)
export const rectsOfKinds = (
  layout: SeatLayout,
  kinds: readonly LayoutObjectKind[],
  except: LayoutObjectRef | null = null
): Rect[] =>
  kinds.flatMap((kind) =>
    entriesOfKind(layout, kind)
      .filter((entry) => !(except && except.kind === kind && except.id === entry.id))
      .map((entry) => entry.rect)
  )

export const rectOfRef = (layout: SeatLayout, ref: LayoutObjectRef): Rect | null =>
  entriesOfKind(layout, ref.kind).find((entry) => entry.id === ref.id)?.rect ?? null
