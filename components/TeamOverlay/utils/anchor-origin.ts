// 押したバウンダリの中心から膨らませるための transform-origin。PC / モバイル共通

// 端に寄りすぎると演出が消えるので 8〜92% にクランプする
const MIN_PERCENT = 8
const MAX_PERCENT = 92

const clamp = (v: number): number => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, v))

export const anchorTransformOrigin = (rect: DOMRect): string => {
  const x = clamp(((rect.left + rect.width / 2) / window.innerWidth) * 100)
  const y = clamp(((rect.top + rect.height / 2) / window.innerHeight) * 100)
  return `${x}% ${y}%`
}
