import { describe, it, expect } from 'vitest'
import { stepAnim } from './anim-step'
import type { AnimStep } from './anim-step'
import { MAX_SCALE } from '@/utils/layout/geometry'
import type { Transform } from '@/utils/layout/geometry'
import type { Anim } from '../type'

const at = (scale: number, translateX = 0, translateY = 0): Transform => ({
  scale,
  translateX,
  translateY,
})

// null(演出なし)を返さない種別の1フレーム
const step = (anim: Anim, t: Transform, minScale = 0.25): AnimStep => {
  const result = stepAnim(anim, t, minScale)
  if (result === null) throw new Error('stepAnim が null を返した')
  return result
}

// 演出が止まるまで回す。止まらなければ上限で打ち切る
const runToEnd = (anim: Anim, t: Transform, minScale: number) => {
  let current = anim
  let transform = t
  let frames = 0
  while (current.kind !== 'none' && frames < 1000) {
    const next = step(current, transform, minScale)
    current = next.nextAnim
    transform = next.transform
    frames += 1
  }
  return { transform, frames, anim: current }
}

describe('stepAnim — 演出なし', () => {
  it('none なら何もせず null を返す', () => {
    expect(stepAnim({ kind: 'none' }, at(1), 0.25)).toBeNull()
  })
})

describe('stepAnim — 慣性', () => {
  it('今の速度で1フレーム平行移動し、摩擦で落とした速度を次の慣性へ渡す', () => {
    expect(step({ kind: 'inertia', vx: 10, vy: -20, frame: 0 }, at(2, 100, 50))).toEqual({
      transform: { scale: 2, translateX: 110, translateY: 30 },
      overscroll: false,
      nextAnim: { kind: 'inertia', vx: expect.closeTo(9.2), vy: expect.closeTo(-18.4), frame: 1 },
      commitSnap: false,
    })
  })

  it('5フレームごとにだけスナップを取り直す', () => {
    const commitAt = (frame: number) =>
      step({ kind: 'inertia', vx: 30, vy: 40, frame }, at(1)).commitSnap
    expect(commitAt(3)).toBe(false)
    expect(commitAt(4)).toBe(true)
    expect(commitAt(5)).toBe(false)
    expect(commitAt(9)).toBe(true)
  })

  it('摩擦後の速さが停止速度を割ったら止め、その回はフレーム数に依らずスナップを取り直す', () => {
    expect(step({ kind: 'inertia', vx: 1, vy: -1, frame: 0 }, at(2, 100, 50))).toEqual({
      transform: { scale: 2, translateX: 101, translateY: 49 },
      overscroll: false,
      nextAnim: { kind: 'none' },
      commitSnap: true,
    })
  })

  it('摩擦後の速さがちょうど停止速度なら、まだ止めない', () => {
    // 1.5 / 0.92 に摩擦を掛けると浮動小数でも 1.5 ちょうどに戻る
    const vx = 1.6304347826086956
    expect(step({ kind: 'inertia', vx, vy: 0, frame: 0 }, at(1)).nextAnim).toEqual({
      kind: 'inertia',
      vx: 1.5,
      vy: 0,
      frame: 1,
    })
  })

  it('くり返すと減速して止まり、倍率は変えない', () => {
    const end = runToEnd({ kind: 'inertia', vx: 30, vy: 40, frame: 0 }, at(2), 0.25)
    expect(end.anim).toEqual({ kind: 'none' })
    expect(end.frames).toBeLessThan(100)
    expect(end.transform.scale).toBe(2)
    // 等比で減る移動量の総和(初速 / (1 - 摩擦) = 375, 500)を超えない
    expect(end.transform.translateX).toBeGreaterThan(300)
    expect(end.transform.translateX).toBeLessThan(375)
    expect(end.transform.translateY).toBeGreaterThan(400)
    expect(end.transform.translateY).toBeLessThan(500)
  })
})

describe('stepAnim — ズームの補間(lerp)', () => {
  const lerp = (targetLevel: number): Anim => ({
    kind: 'lerp',
    targetLevel,
    ax: 300,
    ay: 200,
    alx: 100,
    aly: 50,
  })

  it('段階(log2 倍率)を目標へ 22% 寄せ、アンカーの点を画面上で動かさない', () => {
    const anim = lerp(2)
    const result = step(anim, at(2))
    expect(Math.log2(result.transform.scale)).toBeCloseTo(1.22, 10)
    expect(result.transform.translateX + 100 * result.transform.scale).toBeCloseTo(300, 10)
    expect(result.transform.translateY + 50 * result.transform.scale).toBeCloseTo(200, 10)
    expect(result.overscroll).toBe(false)
    expect(result.nextAnim).toBe(anim)
    expect(result.commitSnap).toBe(false)
  })

  it('縮小方向にも同じ割合で寄せる', () => {
    const result = step(lerp(0), at(4))
    expect(Math.log2(result.transform.scale)).toBeCloseTo(1.56, 10)
  })

  it('倍率は MAX_SCALE を超えない', () => {
    expect(step(lerp(10), at(4)).transform.scale).toBe(MAX_SCALE)
  })

  it('倍率は minScale を割らない', () => {
    expect(step(lerp(-5), at(0.5), 0.4).transform.scale).toBe(0.4)
  })

  it('目標との差が 0.002 未満になったら止め、スナップを取り直す', () => {
    expect(step(lerp(1), at(2))).toEqual({
      transform: { scale: 2, translateX: 100, translateY: 100 },
      overscroll: false,
      nextAnim: { kind: 'none' },
      commitSnap: true,
    })
  })

  it('目標との差がちょうど 0.002 なら、まだ止めない', () => {
    // 最小倍率 1(段階 0)に貼り付いたまま、目標が 0.002 だけ下にある
    const anim = lerp(-0.002)
    const result = step(anim, at(1), 1)
    expect(result.transform.scale).toBe(1)
    expect(result.nextAnim).toBe(anim)
    expect(result.commitSnap).toBe(false)
  })

  it('くり返すと目標の段階に収束して止まる', () => {
    const end = runToEnd(lerp(2), at(1), 0.25)
    expect(end.anim).toEqual({ kind: 'none' })
    expect(end.frames).toBeLessThan(60)
    expect(Math.abs(Math.log2(end.transform.scale) - 2)).toBeLessThan(0.002)
  })
})

describe('stepAnim — 限界へ戻るバウンス', () => {
  const bounce = (limit: number): Anim => ({
    kind: 'bounce',
    limit,
    ax: 300,
    ay: 200,
    alx: 100,
    aly: 50,
  })

  it('倍率を限界へ 22% 寄せ、戻りきるまではクランプを外したままにする', () => {
    const anim = bounce(5)
    const result = step(anim, at(6))
    expect(result.transform.scale).toBeCloseTo(5.78, 10)
    expect(result.transform.translateX + 100 * result.transform.scale).toBeCloseTo(300, 10)
    expect(result.transform.translateY + 50 * result.transform.scale).toBeCloseTo(200, 10)
    expect(result.overscroll).toBe(true)
    expect(result.nextAnim).toBe(anim)
    expect(result.commitSnap).toBe(false)
  })

  it('下限を割った倍率も同じ割合で限界へ戻す', () => {
    expect(step(bounce(0.5), at(0.3)).transform.scale).toBeCloseTo(0.344, 10)
  })

  it('限界との差が 0.0005 未満になったら誤差なしの限界へ吸着して止める', () => {
    expect(step(bounce(5), at(5.0004))).toEqual({
      transform: { scale: 5, translateX: -200, translateY: -50 },
      overscroll: false,
      nextAnim: { kind: 'none' },
      commitSnap: true,
    })
  })

  it('限界との差がちょうど 0.0005 なら、まだ吸着しない', () => {
    // 浮動小数で差をちょうど 0.0005 にできるのは限界がごく小さいときだけなので、限界 0.001 で作る
    const anim = bounce(0.001)
    const result = step(anim, at(0.001641025641025641))
    expect(Math.abs(0.001 - result.transform.scale)).toBe(0.0005)
    expect(result.overscroll).toBe(true)
    expect(result.nextAnim).toBe(anim)
    expect(result.commitSnap).toBe(false)
  })

  it('くり返すと限界ちょうどに戻って止まる', () => {
    const end = runToEnd(bounce(5), at(6), 0.25)
    expect(end.anim).toEqual({ kind: 'none' })
    expect(end.frames).toBeLessThan(60)
    expect(end.transform).toEqual({ scale: 5, translateX: -200, translateY: -50 })
  })
})
