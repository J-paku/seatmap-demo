// useMinimapData(ミニマップの切り取り窓と現在地)が使う窓の計算と定数
import type { MinimapRect } from '../type'
import type { MinimapArea, MinimapFurniture } from '@/types'
import { boundingBoxOf } from '@/utils/layout/rect'

// バウンディングボックス経路の余白(辺の4%、最低24)
const PADDING_MIN = 24
const PADDING_RATIO = 0.04
// 対象が1件も無いときの退化矩形。百分率計算の分母を 0 にしないためだけに存在する
const EMPTY_BOUNDS: MinimapRect = { x: 0, y: 0, w: 1, h: 1 }

export const centerOf = (area: MinimapArea) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 })

// viewBox があるフロアの窓は viewBox 全域(辺は 1 を下回らせない)。以前は現在チームを中心に
// viewBox×(100/35) の窓を取って viewBox の内側へ押し戻していたが、倍率が 1 を超えるため窓は
// どの広さのフロアでも viewBox で頭打ちになり、現在チームの位置は結果に効いていなかった。その結果だけを書く
export const cropWindow = (viewBox: { width: number; height: number }): MinimapRect => {
  const w = Math.max(1, viewBox.width)
  const h = Math.max(1, viewBox.height)
  return { x: viewBox.width - w, y: viewBox.height - h, w, h }
}

// viewBox が無いフロア向けのフォールバック。描く対象を全て囲んでから余白を足す。
// 座席はチーム領域の内側に収まる(fitAreaToSeats が保証する)ので領域だけ見れば足りる
export const boundingWindow = (
  areas: MinimapArea[],
  furniture: MinimapFurniture[],
  currentArea: MinimapArea | null
): MinimapRect => {
  const rects: MinimapRect[] = [
    ...areas.map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h })),
    ...furniture.map(f => ({ x: f.x, y: f.y, w: f.width, h: f.height })),
    ...(currentArea
      ? [{ x: currentArea.x, y: currentArea.y, w: currentArea.w, h: currentArea.h }]
      : []),
  ]
  const box = boundingBoxOf(rects)
  if (!box) return EMPTY_BOUNDS
  const padX = Math.max(PADDING_MIN, box.w * PADDING_RATIO)
  const padY = Math.max(PADDING_MIN, box.h * PADDING_RATIO)
  return {
    x: box.x - padX,
    y: box.y - padY,
    w: Math.max(1, box.w + padX * 2),
    h: Math.max(1, box.h + padY * 2),
  }
}
