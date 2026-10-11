import { describe, it, expect } from 'vitest'
import { centerOnTarget } from './center-on-target'

const canvas = { left: 10, top: 20, width: 200, height: 100 }
const t = { scale: 2, translateX: 5, translateY: 7 }

describe('centerOnTarget', () => {
  it('対象の中心がキャンバスの中心へ来る分だけ平行移動し、倍率は変えない', () => {
    // キャンバスの中心は (110, 70)、対象の中心は (70, 85)。差の (+40, -15) を足す
    const target = { left: 50, top: 70, width: 40, height: 30 }
    expect(centerOnTarget(canvas, target, t)).toEqual({ scale: 2, translateX: 45, translateY: -8 })
  })

  it('対象が既に中心にあれば変換はそのまま', () => {
    const target = { left: 90, top: 55, width: 40, height: 30 }
    expect(centerOnTarget(canvas, target, t)).toEqual(t)
  })
})
