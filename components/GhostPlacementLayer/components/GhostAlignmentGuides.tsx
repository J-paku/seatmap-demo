import type { SnapGuide } from '@/utils/layout/snap-guides'
import styles from '../ghost-placement.module.css'

// 整列ガイド線。ゴーストの下に敷くので枠に隠れない
type Props = { guides: SnapGuide[] }

// §04-3: 端点ドット半径2.5・両端10px延長。
// 線幅はモジュール CSS の border 幅(1.2px)と揃える — ドットを線の中心に載せるのに要る
const DOT_RADIUS = 2.5
const GUIDE_EXTENSION = 10
const GUIDE_LINE_WIDTH = 1.2
// 線の中心にドットの中心を合わせるための、線と直交する向きのオフセット
const DOT_CROSS_OFFSET = GUIDE_LINE_WIDTH / 2 - DOT_RADIUS
// ドットの中心は延長ぶんを除いた実際の端点(start / end)に置く
const DOT_ALONG_OFFSET = GUIDE_EXTENSION - DOT_RADIUS

// 固定外形(半径・色・形)は styles.guideDot(CSS モジュール)側。ここが持つのは毎フレーム実測される位置だけ
const dotStyle = (axis: SnapGuide['axis'], along: number) =>
  axis === 'vertical' ? { left: DOT_CROSS_OFFSET, top: along } : { top: DOT_CROSS_OFFSET, left: along }

export const GhostAlignmentGuides = ({ guides }: Props) => (
  <>
    {guides.map((g) => {
      const isVertical = g.axis === 'vertical'
      const from = g.start - GUIDE_EXTENSION
      const length = g.end - g.start + GUIDE_EXTENSION * 2
      return (
        <span
          key={`${g.axis}-${g.pos}`}
          className={`${styles.guide} ${isVertical ? styles.isVertical : styles.isHorizontal}`}
          // 線分の範囲は毎フレーム変わる実測値なので、CSS 側の全画面指定をここで上書きする
          style={
            isVertical
              ? { left: g.pos, top: from, bottom: 'auto', height: length }
              : { top: g.pos, left: from, right: 'auto', width: length }
          }
        >
          <span className={styles.guideDot} style={dotStyle(g.axis, DOT_ALONG_OFFSET)} />
          <span className={styles.guideDot} style={dotStyle(g.axis, length - GUIDE_EXTENSION - DOT_RADIUS)} />
        </span>
      )
    })}
  </>
)
