import { useMemo } from 'react'
import type { MinimapRect } from '../type'
import type { MinimapArea, MinimapFurniture } from '@/types'
import { boundingBoxOf, clampRectToViewBox } from '@/utils/layout/rect'

// ミニマップの「どこを切り取って見せるか」と「現在地が窓のどこか」を決める計算。
// 純粋計算のみで副作用を持たない

// 原本の切り取り倍率。窓は viewBox のこの逆数ぶんの大きさで、現在チームを中心に置く
const MINIMAP_SCALE_PERCENT = 35
const ZOOM_OUT_FACTOR = 100 / MINIMAP_SCALE_PERCENT
// バウンディングボックス経路の余白(辺の4%、最低24)
const PADDING_MIN = 24
const PADDING_RATIO = 0.04
// 対象が1件も無いときの退化矩形。百分率計算の分母を 0 にしないためだけに存在する
const EMPTY_BOUNDS: MinimapRect = { x: 0, y: 0, w: 1, h: 1 }

type Options = {
  areas: MinimapArea[]
  furniture: MinimapFurniture[]
  currentArea: MinimapArea | null
  viewBox?: { width: number; height: number }
}

type MinimapCurrentCenter = {
  centerX: number
  centerY: number
  xRate: number
  yRate: number
}

export type MinimapData = {
  worldBounds: MinimapRect
  currentCenter: MinimapCurrentCenter | null
  drawAreas: MinimapArea[]
  drawFurniture: MinimapFurniture[]
  hasContent: boolean
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const centerOf = (area: MinimapArea) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 })

// 現在チームを中心に viewBox×ZOOM_OUT_FACTOR の窓を取り、viewBox の内側へ押し戻す。
// 窓が viewBox より大きければ全域に退化する(このデモの 1600×1154 はその状態で、
// 会議室まで含めてフロア全体が入る)。フロアがもっと広い場合だけ切り取りとして働く
const cropWindow = (
  viewBox: { width: number; height: number },
  currentArea: MinimapArea | null
): MinimapRect => {
  const w = Math.max(1, Math.min(viewBox.width, viewBox.width * ZOOM_OUT_FACTOR))
  const h = Math.max(1, Math.min(viewBox.height, viewBox.height * ZOOM_OUT_FACTOR))
  const center = currentArea ? centerOf(currentArea) : { x: viewBox.width / 2, y: viewBox.height / 2 }
  return clampRectToViewBox({ x: center.x - w / 2, y: center.y - h / 2, w, h }, viewBox.width, viewBox.height)
}

// viewBox が無いフロア向けのフォールバック。描く対象を全て囲んでから余白を足す。
// 座席はチーム領域の内側に収まる(fitAreaToSeats が保証する)ので領域だけ見れば足りる
const boundingWindow = (
  areas: MinimapArea[],
  furniture: MinimapFurniture[],
  currentArea: MinimapArea | null
): MinimapRect => {
  const rects: MinimapRect[] = [
    ...areas.map((a) => ({ x: a.x, y: a.y, w: a.w, h: a.h })),
    ...furniture.map((f) => ({ x: f.x, y: f.y, w: f.width, h: f.height })),
    ...(currentArea ? [{ x: currentArea.x, y: currentArea.y, w: currentArea.w, h: currentArea.h }] : []),
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

export const useMinimapData = ({ areas, furniture, currentArea, viewBox }: Options): MinimapData => {
  // サイズ 0 の家具は描いても見えないうえ最小寸法の下駄だけが残るので、ここで落とす
  const drawFurniture = useMemo(
    () => furniture.filter((f) => f.width > 0 && f.height > 0),
    [furniture]
  )

  const worldBounds = useMemo(
    () => (viewBox ? cropWindow(viewBox, currentArea) : boundingWindow(areas, drawFurniture, currentArea)),
    [viewBox, currentArea, areas, drawFurniture]
  )

  // 窓が viewBox 内へクランプされる結果、端のチームは中心が 0.5 にならない。
  // 窓の外へ出た場合でも十字線が枠外へ飛ばないよう 0〜1 に収める
  const currentCenter = useMemo((): MinimapCurrentCenter | null => {
    if (!currentArea) return null
    const { x, y } = centerOf(currentArea)
    return {
      centerX: x,
      centerY: y,
      xRate: clamp01((x - worldBounds.x) / worldBounds.w),
      yRate: clamp01((y - worldBounds.y) / worldBounds.h),
    }
  }, [currentArea, worldBounds])

  return {
    worldBounds,
    currentCenter,
    drawAreas: areas,
    drawFurniture,
    hasContent: areas.length > 0 || drawFurniture.length > 0,
  }
}
