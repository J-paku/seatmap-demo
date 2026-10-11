import type { SnapGuide } from '@/utils/layout/snap-guides'
import styles from '../ghost-placement.module.css'

// 整列ガイド線。ゴーストの下に敷くので枠に隠れない
type Props = { guides: SnapGuide[] }

// §04-3: 端点ドット半径2.5(直径5px)。
// 線幅はモジュール CSS の border 幅(1.2px)と揃える — ドットを線の中心に載せるのに要る
const DOT_RADIUS = 2.5
const GUIDE_LINE_WIDTH = 1.2
// 線の中心にドットの中心を合わせるための、線と直交する向きのオフセット
const DOT_CROSS_OFFSET = GUIDE_LINE_WIDTH / 2 - DOT_RADIUS

// 固定外形(半径・色・形)は styles.guideDot(CSS モジュール)側。ここが持つのは毎フレーム実測される位置だけ
const dotStyle = (axis: SnapGuide['axis'], along: number) =>
  axis === 'vertical' ? { left: DOT_CROSS_OFFSET, top: along } : { top: DOT_CROSS_OFFSET, left: along }

// 線は [start, end] をそのまま描く。両端の延長は既にジオメトリ側(snap-guides)が焼き込んでおり、
// ここで足すと二重になって線が対象物より長くなる。ドットは延長を除いた実端点 = 線の両端から
// g.extend 内側に置く(g.extend は画面座標へ写す時に倍率が掛かっているので画面px固定にしない)
export const GhostAlignmentGuides = ({ guides }: Props) => (
  <>
    {guides.map((g) => {
      const isVertical = g.axis === 'vertical'
      const length = g.end - g.start
      return (
        <span
          key={`${g.axis}-${g.pos}`}
          className={`${styles.guide} ${isVertical ? styles.isVertical : styles.isHorizontal}`}
          data-ghost='guide'
          data-guide-axis={g.axis}
          // 線分の範囲は毎フレーム変わる実測値なので、CSS 側の全画面指定をここで上書きする
          style={
            isVertical
              ? { left: g.pos, top: g.start, bottom: 'auto', height: length }
              : { top: g.pos, left: g.start, right: 'auto', width: length }
          }
        >
          <span className={styles.guideDot} style={dotStyle(g.axis, g.extend - DOT_RADIUS)} />
          <span className={styles.guideDot} style={dotStyle(g.axis, length - g.extend - DOT_RADIUS)} />
        </span>
      )
    })}
  </>
)
