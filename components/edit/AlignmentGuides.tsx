// 07-admin-edit: 整列スナップ成立中の基準線ガイド(viewBox座標系・変換レイヤー内に描画)
import type { SnapGuide } from '@/utils/snap-guides'
import e from './admin-edit.module.css'

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
          className={`${e.editSnapGuide} ${e.editSnapGuideVertical}`}
          style={{ left: g.pos, top: 0, height: viewBoxH }}
        />
      ) : (
        <div
          key={`h-${i}`}
          className={`${e.editSnapGuide} ${e.editSnapGuideHorizontal}`}
          style={{ top: g.pos, left: 0, width: viewBoxW }}
        />
      )
    )}
  </>
)
