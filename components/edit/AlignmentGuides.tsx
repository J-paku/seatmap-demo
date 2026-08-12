// 07-admin-edit: 整列スナップ成立中の基準線ガイド(viewBox座標系・変換レイヤー内に描画)
import type { SnapGuide } from '@/utils/layout/snap-guides'
import e from './admin-edit.module.css'

type Props = {
  guides: SnapGuide[]
  viewBoxW: number
  viewBoxH: number
}

// §04-3: 色var(--color-align-guide)・1.2px破線・不透明度0.85・端点ドット半径2.5・両端10px延長。
// admin-edit.module.css は担当外のため、無限直線用の .editSnapGuide* クラス(position/pointer-events/
// z-index)だけを流用し、破線・不透明度・色・端点ドットは全てここでインラインに上書きする
const DOT_RADIUS = 2.5
const GUIDE_EXTENSION = 10
const GUIDE_LINE_WIDTH = 1.2
// 線の中心にドットの中心を合わせるための、線と直交する向きのオフセット
const DOT_CROSS_OFFSET = GUIDE_LINE_WIDTH / 2 - DOT_RADIUS
// ドットの中心は延長ぶんを除いた実際の端点(start / end)に置く
const DOT_ALONG_OFFSET = GUIDE_EXTENSION - DOT_RADIUS

const dotStyle = (axis: SnapGuide['axis'], along: number) => ({
  position: 'absolute' as const,
  width: DOT_RADIUS * 2,
  height: DOT_RADIUS * 2,
  borderRadius: '9999px',
  background: 'var(--color-align-guide)',
  ...(axis === 'vertical' ? { left: DOT_CROSS_OFFSET, top: along } : { top: DOT_CROSS_OFFSET, left: along }),
})

export const AlignmentGuides = ({ guides }: Props) => (
  <>
    {guides.map((g) => {
      const isVertical = g.axis === 'vertical'
      const from = g.start - GUIDE_EXTENSION
      const length = g.end - g.start + GUIDE_EXTENSION * 2
      return (
        <div
          key={`${g.axis}-${g.pos}-${g.start}`}
          className={`${e.editSnapGuide} ${isVertical ? e.editSnapGuideVertical : e.editSnapGuideHorizontal}`}
          // §04-3: 線分の範囲は毎フレーム変わる実測値。破線・不透明度・色トークンは
          // admin-edit.module.css を触れない担当分割の都合上、ここでクラスの背景色指定を上書きする
          style={
            isVertical
              ? {
                  left: g.pos,
                  top: from,
                  width: 0,
                  height: length,
                  background: 'none',
                  borderLeft: `${GUIDE_LINE_WIDTH}px dashed var(--color-align-guide)`,
                  opacity: 0.85,
                }
              : {
                  top: g.pos,
                  left: from,
                  height: 0,
                  width: length,
                  background: 'none',
                  borderTop: `${GUIDE_LINE_WIDTH}px dashed var(--color-align-guide)`,
                  opacity: 0.85,
                }
          }
        >
          <span style={dotStyle(g.axis, DOT_ALONG_OFFSET)} />
          <span style={dotStyle(g.axis, length - GUIDE_EXTENSION - DOT_RADIUS)} />
        </div>
      )
    })}
  </>
)
