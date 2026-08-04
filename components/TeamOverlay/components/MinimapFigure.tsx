import { MINIMAP_MIN_SIZE_PX, minimapLabelStyle, singleLineLabel, truncateLabel } from '../utils/minimap-label'
import type { MinimapData } from '../hooks/use-minimap-data'
import type { MinimapArea, MinimapFurniture, MinimapRect } from '../type'

// ミニマップの図そのもの。格子・十字線・会議室・チーム領域を百分率で重ねる。
// 位置を表す装飾なので図形は全て aria-hidden、中身は pointer-events を持たない

type Props = {
  data: MinimapData
  currentIdPrefix: string
}

// 窓を基準にした百分率。潰れ防止に幅・高さだけ最小寸法の下駄を履かせる
const boxStyle = (bounds: MinimapRect, x: number, y: number, w: number, h: number) => ({
  left: `${((x - bounds.x) / bounds.w) * 100}%`,
  top: `${((y - bounds.y) / bounds.h) * 100}%`,
  width: `max(${MINIMAP_MIN_SIZE_PX}px, ${(w / bounds.w) * 100}%)`,
  height: `max(${MINIMAP_MIN_SIZE_PX}px, ${(h / bounds.h) * 100}%)`,
})

const FacilityBox = ({ item, bounds }: { item: MinimapFurniture; bounds: MinimapRect }) => {
  const label = minimapLabelStyle(item.width / bounds.w, item.height / bounds.h)
  return (
    <span className='team-ovl-mini-fac' style={boxStyle(bounds, item.x, item.y, item.width, item.height)}>
      <span className='icon-msr-filled team-ovl-mini-fac-icon'>meeting_room</span>
      <span className='team-ovl-mini-fac-name' style={{ fontSize: label.fontSize }}>
        {truncateLabel(item.name, label.maxChars)}
      </span>
    </span>
  )
}

const AreaBox = ({
  area,
  bounds,
  isCurrent,
}: {
  area: MinimapArea
  bounds: MinimapRect
  isCurrent: boolean
}) => (
  <span
    className={`team-ovl-mini-area${isCurrent ? ' is-current' : ''}`}
    style={{
      ...boxStyle(bounds, area.x, area.y, area.w, area.h),
      ...(isCurrent ? { background: `color-mix(in srgb, ${area.dotColor} 18%, transparent)` } : {}),
    }}
  >
    <span className={`team-ovl-mini-pill${isCurrent ? ' is-current' : ''}`}>
      <i className='team-ovl-mini-dot' style={{ background: area.dotColor }} />
      {singleLineLabel(area.label)}
      {isCurrent && <span className='icon-msr-filled team-ovl-mini-pin'>place</span>}
    </span>
  </span>
)

export const MinimapFigure = ({ data, currentIdPrefix }: Props) => {
  const { worldBounds, currentCenter, drawAreas, drawFurniture } = data
  return (
    <div className='team-ovl-mini-frame' aria-hidden='true'>
      <span className='team-ovl-mini-grid' />
      {drawFurniture.map((item) =>
        item.kind === 'facility' ? (
          <FacilityBox key={item.id} item={item} bounds={worldBounds} />
        ) : (
          <span
            key={item.id}
            className={`team-ovl-mini-struct${item.kind === 'object' ? ' is-object' : ''}`}
            style={boxStyle(worldBounds, item.x, item.y, item.width, item.height)}
          />
        )
      )}
      {currentCenter && (
        <>
          <span className='team-ovl-mini-cross-v' style={{ left: `${currentCenter.xRate * 100}%` }} />
          <span className='team-ovl-mini-cross-h' style={{ top: `${currentCenter.yRate * 100}%` }} />
        </>
      )}
      {drawAreas.map((area) => (
        <AreaBox
          key={area.idPrefix}
          area={area}
          bounds={worldBounds}
          isCurrent={area.idPrefix === currentIdPrefix}
        />
      ))}
    </div>
  )
}
