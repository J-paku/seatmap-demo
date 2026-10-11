import { useMemo } from 'react'
import type { MinimapRect } from '../type'
import type { MinimapArea, MinimapFurniture } from '@/types'
import { clamp } from '@/utils/layout/geometry'
import { boundingWindow, centerOf, cropWindow } from '../utils/compute-minimap-bounds'

// ミニマップの「どこを切り取って見せるか」と「現在地が窓のどこか」を決める。
// 窓の計算そのものは utils/compute-minimap-bounds にあり、ここは useMemo でつなぐだけ(副作用は持たない)

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

export const useMinimapData = ({
  areas,
  furniture,
  currentArea,
  viewBox,
}: Options): MinimapData => {
  // サイズ 0 の家具は描いても見えないうえ最小寸法の下駄だけが残るので、ここで落とす
  const drawFurniture = useMemo(
    () => furniture.filter(f => f.width > 0 && f.height > 0),
    [furniture]
  )

  const worldBounds = useMemo(
    () => (viewBox ? cropWindow(viewBox) : boundingWindow(areas, drawFurniture, currentArea)),
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
      xRate: clamp((x - worldBounds.x) / worldBounds.w, 0, 1),
      yRate: clamp((y - worldBounds.y) / worldBounds.h, 0, 1),
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
