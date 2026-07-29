// 07-admin-edit: 整列スナップ成立中の基準線ガイド(viewBox座標系・変換レイヤー内に描画)
import type { SnapGuide } from '@/utils/snap-guides'

type Props = {
  guides: SnapGuide[]
  viewBoxW: number
  viewBoxH: number
}

export const AlignmentGuides = ({ guides, viewBoxW, viewBoxH }: Props) => (
  <>
    {guides.map((g, i) =>
      g.axis === 'vertical' ? (
        <div
          key={`v-${i}`}
          className='edit-snap-guide edit-snap-guide-vertical'
          style={{ left: g.pos, top: 0, height: viewBoxH }}
        />
      ) : (
        <div
          key={`h-${i}`}
          className='edit-snap-guide edit-snap-guide-horizontal'
          style={{ top: g.pos, left: 0, width: viewBoxW }}
        />
      )
    )}
  </>
)
