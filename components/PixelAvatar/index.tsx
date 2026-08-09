// ピクセルアバター本体 — parts 合成結果を SVG rect でレンダリング (sprites 不要)
import { usePixelAvatar } from './hooks/use-pixel-avatar'
import type { PixelAvatarConfig } from '@/types'

interface PixelAvatarProps {
  config?: PixelAvatarConfig | null
  size?: number
  ariaLabel?: string
}

const DEFAULT_SIZE = 32

// 輪郭の太さ (viewBox 単位 / 1セル=1 より十分細く) と色
const STROKE_WIDTH = 0.16
const STROKE_COLOR = 'var(--color-avatar-stroke)'

// シルエットを8方向に微小オフセット複製して細い縁取りを作る (セルを埋めないので大きさは1セル未満)
const STROKE_OFFSETS: [number, number][] = [
  [-STROKE_WIDTH, 0],
  [STROKE_WIDTH, 0],
  [0, -STROKE_WIDTH],
  [0, STROKE_WIDTH],
  [-STROKE_WIDTH, -STROKE_WIDTH],
  [STROKE_WIDTH, -STROKE_WIDTH],
  [-STROKE_WIDTH, STROKE_WIDTH],
  [STROKE_WIDTH, STROKE_WIDTH],
]

export function PixelAvatar({
  config,
  size = DEFAULT_SIZE,
  ariaLabel,
}: PixelAvatarProps) {
  const { rects, size: gridSize } = usePixelAvatar({ config })
  return (
    <svg
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      shapeRendering='crispEdges'
      style={{ display: 'inline-block', flexShrink: 0, imageRendering: 'pixelated' }}
    >
      {/* 縁取り — 前景の下に敷くため先に描画。crispEdges だと微小オフセットが丸まるので個別に滑らか描画 */}
      {STROKE_OFFSETS.map(([dx, dy], oi) =>
        rects.map((r, idx) => (
          <rect
            key={`stroke-${oi}-${r.x}-${r.y}-${idx}`}
            x={r.x + dx}
            y={r.y + dy}
            width={r.w}
            height={1}
            shapeRendering='geometricPrecision'
            style={{ fill: STROKE_COLOR }}
          />
        ))
      )}
      {rects.map((r, idx) => (
        <rect
          key={`${r.x}-${r.y}-${idx}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          style={{ fill: r.color }}
        />
      ))}
    </svg>
  )
}
