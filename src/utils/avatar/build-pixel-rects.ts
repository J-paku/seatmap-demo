import { composePixelsAvatarMatrix, resolvePixelColorForFree } from './matrices/compose'
import type { PixelsAvatarConfig } from '@/types'

export interface PixelRect {
  x: number
  y: number
  w: number
  color: string
}

// マトリクスを横方向に走査し、同色連続セルを 1 rect にマージ
// gridSize は 8 または 16
export const buildRectsFromMatrix = (
  matrix: (string | null)[][],
  gridSize: number,
  colorResolver: (cell: string | null) => string | null
): PixelRect[] => {
  const rects: PixelRect[] = []
  matrix.forEach((row, y) => {
    // 描きかけの同色連続。null は連続の外(透明セルの上)。開始位置と色を1つに持ち、
    // 片方だけが残る中途半端な状態を作らない
    let run: { start: number; color: string } | null = null
    const flush = (endX: number) => {
      if (run) {
        rects.push({ x: run.start, y, w: endX - run.start, color: run.color })
      }
      run = null
    }
    row.forEach((cell, x) => {
      const color = colorResolver(cell)
      if (run && color === run.color) {
        return
      }
      flush(x)
      if (color) {
        run = { start: x, color }
      }
    })
    flush(gridSize)
  })
  return rects
}

// 16x16 pixels 用 rect ビルダー
export const buildRectsForPixels = (config: PixelsAvatarConfig): PixelRect[] => {
  const matrix = composePixelsAvatarMatrix(config)
  return buildRectsFromMatrix(matrix, 16, cell =>
    cell ? resolvePixelColorForFree(cell, config.palette) : null
  )
}
