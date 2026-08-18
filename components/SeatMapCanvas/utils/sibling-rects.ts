import { rectsOfKinds } from '@/utils/layout/layout-objects'
import type { LayoutObjectRef, SeatLayout } from '@/types'
import type { Rect } from '../type'

// スナップ吸着候補になる兄弟オブジェクトの矩形群。
// どの種別を含めるかだけをここで決め、配列の取り出しは utils/layout/layout-objects へ委ねる
// (種別が増えたとき、ここへ書き足し忘れても layout-objects 側で型エラーになる)
// 座席単体をドラッグする経路はキャンバスに無い(座席は描かれない)ので、座席用の候補群は持たない

// 会議室・家具はチーム枠・他の会議室/家具に吸着する(座席はスナップ候補から除外 — §04-3)
export const siblingRectsForObject = (layout: SeatLayout, self: LayoutObjectRef | null): Rect[] =>
  rectsOfKinds(layout, ['team', 'facility', 'furniture'], self)
