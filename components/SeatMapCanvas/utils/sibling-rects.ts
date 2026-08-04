import { rectsOfKinds } from '@/utils/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'
import type { Rect } from '../type'

// スナップ吸着候補になる兄弟オブジェクトの矩形群。
// どの種別を含めるかだけをここで決め、配列の取り出しは utils/layout-objects へ委ねる
// (種別が増えたとき、ここへ書き足し忘れても layout-objects 側で型エラーになる)

// 座席は他の座席・会議室・家具・チームエリアに吸着する
export const siblingRectsForSeat = (layout: SeatLayout, excludeSeatId: string): Rect[] =>
  rectsOfKinds(layout, ['seat', 'facility', 'furniture', 'team'], { kind: 'seat', id: excludeSeatId })

// チームエリアは所属座席ごと動くので、座席は吸着相手に含めない
export const siblingRectsForTeam = (layout: SeatLayout, excludeTeamId: string): Rect[] =>
  rectsOfKinds(layout, ['team', 'facility', 'furniture'], { kind: 'team', id: excludeTeamId })

// 会議室・家具は全ての種別に吸着する
export const siblingRectsForObject = (layout: SeatLayout, self: LayoutObjectRef | null): Rect[] =>
  rectsOfKinds(layout, ['seat', 'team', 'facility', 'furniture'], self)
