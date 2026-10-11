// レイアウト上のオブジェクトを種別横断で引く唯一の入口。
//
// 「当たり判定と吸着の対象に何が含まれるか」はもともと layout-rules に3つ・sibling-rects に2つ、
// 計5箇所へ手書きで散っていた。種別が増えたときこの5箇所を全て直さないと、新種別だけが
// 素通りするのに型エラーは出ない — 無言で壊れる。下の種別キーの Record に集約し、
// 種別を足したらキー不足でコンパイルが落ちるようにして取りこぼしを型で塞ぐ。
//
// ここが答えるのは「どこに何があるか」だけ。ぶつかった時に何が起きるか(座席同士は入れ替え、
// 会議室とは拒否、チームエリア内は所属変更)はポリシーなので layout-rules 側に残す
import { rectOf, rotatedRectOf } from './rect'
import type { Rect } from './rect'
import type { LayoutObjectKind, LayoutObjectRef, SeatLayout, Team } from '@/types'

export type LayoutObjectEntry = { id: string; rect: Rect }

const areaRect = (area: Team['area']): Rect => ({ x: area.x, y: area.y, w: area.w, h: area.h })

// 種別を足してここにキーを書き忘れると、Record の型がコンパイルエラーになる
const ENTRIES_BY_KIND: Record<LayoutObjectKind, (layout: SeatLayout) => LayoutObjectEntry[]> = {
  seat: layout => layout.seats.map(s => ({ id: s.id, rect: rectOf(s) })),
  team: layout => layout.teams.map(t => ({ id: t.id, rect: areaRect(t.area) })),
  facility: layout => layout.facilities.map(f => ({ id: f.id, rect: rectOf(f) })),
  // 家具だけが rotation を持つ。座席は保存時に幅高さの交換を済ませており、
  // 会議室(Facility)は rotation フィールドを持たないので、どちらもここへ載せない
  furniture: layout => layout.furniture.map(f => ({ id: f.id, rect: rotatedRectOf(f) })),
}

const entriesOfKind = (layout: SeatLayout, kind: LayoutObjectKind): LayoutObjectEntry[] =>
  ENTRIES_BY_KIND[kind](layout)

// 指定した種別群の矩形を集める。except に一致するものだけ除く(移動中の自分自身)
export const rectsOfKinds = (
  layout: SeatLayout,
  kinds: readonly LayoutObjectKind[],
  except: LayoutObjectRef | null = null
): Rect[] =>
  kinds.flatMap(kind =>
    entriesOfKind(layout, kind)
      .filter(entry => !(except && except.kind === kind && except.id === entry.id))
      .map(entry => entry.rect)
  )

export const rectOfRef = (layout: SeatLayout, ref: LayoutObjectRef): Rect | null =>
  entriesOfKind(layout, ref.kind).find(entry => entry.id === ref.id)?.rect ?? null
