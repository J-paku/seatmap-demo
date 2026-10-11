// useGhostTransform が使う、キャンバスと変換レイヤーの DOM 探索と変換の実測
import { SEATMAP_BG_ID } from '@/components/SheetShell'

export type Transform = { scale: number; tx: number; ty: number }

export const readTransform = (layer: Element): Transform => {
  const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
  return { scale: m.a || 1, tx: m.e, ty: m.f }
}

export const findLayer = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-canvas-transform-layer="true"]')

export const findCanvas = (): HTMLElement | null => document.getElementById(SEATMAP_BG_ID)
