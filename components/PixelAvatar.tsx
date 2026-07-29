import { useMemo } from 'react'
import type { AvatarConfig } from '@/types'

// AvatarConfig を 8×8 グリッド(コード配列)へ合成する
// コード: H=髪 / S=肌 / O=上衣 / I=上衣の内側(濃色2トーン) / E=目 / M=口 / .=空
// 配置は原本実測(髪が上部フレーム・目は col3/col5・下2段が上衣で最下段中央が内側濃色)

type Props = {
  config: AvatarConfig
  size: number
}

const EYE_COLOR = '#1A1A1A'
const MOUTH_COLOR = '#9E5B4E'
const STROKE_COLOR = '#1A1A1A'

// 8方向オフセット(シルエット外郭用・0.16セル)
const OUTLINE_OFFSETS: Array<[number, number]> = [
  [0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16],
  [0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16],
]

// 上衣色から内側の濃色トーンを生成(暗さ32%)
const darken = (hex: string, factor: number): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.round(((n >> 16) & 255) * (1 - factor))
  const g = Math.round(((n >> 8) & 255) * (1 - factor))
  const b = Math.round((n & 255) * (1 - factor))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const buildGrid = (c: AvatarConfig): string[] => {
  // ベース(髪フレーム+肌の顔+上衣2トーン肩)
  const g: string[][] = [
    ['.', '.', 'H', 'H', 'H', 'H', '.', '.'],
    ['.', 'H', 'H', 'H', 'H', 'H', 'H', '.'],
    ['.', 'H', 'S', 'S', 'S', 'S', 'H', '.'],
    ['.', 'H', 'S', 'E', 'S', 'E', 'H', '.'],
    ['.', '.', 'S', 'S', 'S', 'S', '.', '.'],
    ['.', 'S', 'S', 'S', 'S', 'S', 'S', '.'],
    ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
    ['O', 'O', 'I', 'I', 'I', 'I', 'O', 'O'],
  ]
  const set = (r: number, col: number, v: string) => {
    g[r][col] = v
  }

  // 髪型バリエーション
  if (c.hair === 'bald') {
    // 上部フレーム・側面の髪を除去(顔の輪郭のみ)
    for (let col = 0; col < 8; col++) {
      if (g[0][col] === 'H') set(0, col, '.')
      if (g[1][col] === 'H') set(1, col, '.')
    }
    set(2, 1, 'S'); set(2, 6, 'S')
    set(3, 1, 'S'); set(3, 6, 'S')
  }
  if (c.hair === 'long') {
    // 側面を下方へ延長
    set(4, 1, 'H'); set(4, 6, 'H')
    set(5, 0, 'H'); set(5, 7, 'H')
  }
  if (c.hair === 'bob') {
    set(4, 1, 'H'); set(4, 6, 'H')
  }
  if (c.hair === 'ponytail') {
    // 右後方へ結い上げ
    set(2, 7, 'H'); set(3, 7, 'H'); set(4, 7, 'H')
  }

  // 表情バリエーション
  if (c.face === 'wink') {
    set(3, 5, 'S')
  }
  if (c.face === 'smile') {
    set(4, 3, 'M'); set(4, 4, 'M')
  }

  return g.map((row) => row.join(''))
}

// 同色の横連続セルを 1つの矩形にまとめる
type Rect = { x: number; y: number; w: number; fill: string }

const mergeRuns = (grid: string[], palette: AvatarConfig['palette']): Rect[] => {
  const innerColor = darken(palette.outfit, 0.32)
  const colorOf = (ch: string): string | null => {
    switch (ch) {
      case 'H':
        return palette.hair
      case 'S':
        return palette.skin
      case 'O':
        return palette.outfit
      case 'I':
        return innerColor
      case 'E':
        return EYE_COLOR
      case 'M':
        return MOUTH_COLOR
      default:
        return null
    }
  }
  const rects: Rect[] = []
  grid.forEach((row, y) => {
    let runStart = -1
    let runColor: string | null = null
    const flush = (endX: number) => {
      if (runStart >= 0 && runColor) {
        rects.push({ x: runStart, y, w: endX - runStart, fill: runColor })
      }
      runStart = -1
      runColor = null
    }
    for (let x = 0; x < row.length; x++) {
      const col = colorOf(row[x])
      if (col === runColor && col !== null) continue
      flush(x)
      if (col) {
        runStart = x
        runColor = col
      }
    }
    flush(row.length)
  })
  return rects
}

export const PixelAvatar = ({ config, size }: Props) => {
  const rects = useMemo(() => mergeRuns(buildGrid(config), config.palette), [config])
  // シルエット外郭: 前景 run(目・口を除く)を 8方向にオフセット複製して背面に敷く
  const silhouette = useMemo(() => rects.filter((r) => r.fill !== EYE_COLOR && r.fill !== MOUTH_COLOR), [rects])

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 8 8'
      shapeRendering='crispEdges'
      style={{ imageRendering: 'pixelated', display: 'block' }}
      aria-hidden='true'
    >
      {OUTLINE_OFFSETS.map(([dx, dy], i) => (
        <g key={`o${i}`} transform={`translate(${dx} ${dy})`}>
          {silhouette.map((r, j) => (
            <rect key={j} x={r.x} y={r.y} width={r.w} height={1} fill={STROKE_COLOR} />
          ))}
        </g>
      ))}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
