import type { SnapGuide } from '@/utils/snap-guides'
import styles from '../ghost-placement.module.css'

// 整列ガイド線。ゴーストの下に敷くので枠に隠れない
type Props = { guides: SnapGuide[] }

export const GhostAlignmentGuides = ({ guides }: Props) => (
  <>
    {guides.map((g) => (
      <span
        key={`${g.axis}-${g.pos}`}
        className={`${styles.guide} ${g.axis === 'vertical' ? styles.isVertical : styles.isHorizontal}`}
        style={g.axis === 'vertical' ? { left: g.pos } : { top: g.pos }}
      />
    ))}
  </>
)
