import type { Transform } from '@/utils/layout/geometry'

// 画面上の矩形(getBoundingClientRect の値)のうち、中心を出すのに使う4つだけ
type ScreenBox = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

// 対象の中心をキャンバスの中心へ合わせる変換。倍率は変えず平行移動だけで合わせる
export const centerOnTarget = (canvas: ScreenBox, target: ScreenBox, t: Transform): Transform => {
  const dx = canvas.left + canvas.width / 2 - (target.left + target.width / 2)
  const dy = canvas.top + canvas.height / 2 - (target.top + target.height / 2)
  return {
    scale: t.scale,
    translateX: t.translateX + dx,
    translateY: t.translateY + dy,
  }
}
