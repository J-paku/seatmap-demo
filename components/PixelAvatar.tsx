import { useMemo } from 'react'
import type { AvatarConfig } from '@/lib/types'

// AvatarConfig を 8×8 グリッド(コード配列)へ合成する
// コード: H=髪 / S=肌 / O=衣装 / E=目 / M=口 / .=空

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

const buildGrid = (c: AvatarConfig): string[] => {
  // ベース(肌の顔+衣装の肩)
  const g: string[][] = [
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', 'S', 'S', 'S', 'S', 'S', 'S', '.'],
    ['.', 'S', 'S', 'S', 'S', 'S', 'S', '.'],
    ['.', 'S', 'S', 'S', 'S', 'S', 'S', '.'],
    ['.', 'S', 'S', 'S', 'S', 'S', 'S', '.'],
    ['.', '.', 'O', 'O', 'O', 'O', '.', '.'],
    ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
    ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
  ]
  const set = (r: number, col: number, v: string) => {
    g[r][col] = v
  }

  // 髪パーツ
  if (c.hair !== 'bald') {
    for (let col = 1; col <= 6; col++) set(0, col, 'H')
    set(1, 1, 'H')
    set(1, 6, 'H')
  }
  if (c.hair === 'long') {
    set(0, 0, 'H'); set(0, 7, 'H')
    set(1, 0, 'H'); set(1, 7, 'H')
    set(2, 0, 'H'); set(2, 7, 'H')
    set(3, 0, 'H'); set(3, 7, 'H')
  }
  if (c.hair === 'bob') {
    set(1, 0, 'H'); set(1, 7, 'H')
    set(2, 0, 'H'); set(2, 7, 'H')
  }
  if (c.hair === 'ponytail') {
    set(1, 7, 'H'); set(2, 7, 'H'); set(3, 7, 'H')
  }

  // 顔パーツ(目・口)
  set(2, 2, 'E')
  set(2, 5, c.face === 'wink' ? 'S' : 'E')
  if (c.face === 'smile') {
    set(4, 2, 'M'); set(4, 3, 'M'); set(4, 4, 'M'); set(4, 5, 'M')
  } else {
    set(4, 3, 'M'); set(4, 4, 'M')
  }

  return g.map((row) => row.join(''))
}

// 同色の横連続セルを 1つの矩形にまとめる
type Rect = { x: number; y: number; w: number; fill: string }

const mergeRuns = (grid: string[], palette: AvatarConfig['palette']): Rect[] => {
  const colorOf = (ch: string): string | null => {
    switch (ch) {
      case 'H':
        return palette.hair
      case 'S':
        return palette.skin
      case 'O':
        return palette.outfit
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
  // シルエット外郭: 前景 run を 8方向にオフセット複製して背面に敷く
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
