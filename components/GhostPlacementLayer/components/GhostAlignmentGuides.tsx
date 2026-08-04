import type { SnapGuide } from '@/utils/snap-guides'

// 整列ガイド線。ゴーストの下に敷くので枠に隠れない
type Props = { guides: SnapGuide[] }

export const GhostAlignmentGuides = ({ guides }: Props) => (
  <>
    {guides.map((g) => (
      <span
        key={`${g.axis}-${g.pos}`}
        className={`ghost-guide is-${g.axis}`}
        style={g.axis === 'vertical' ? { left: g.pos } : { top: g.pos }}
      />
    ))}
  </>
)
