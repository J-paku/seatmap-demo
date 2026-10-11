import { describe, it, expect } from 'vitest'
import { snapThreshold, computeSnap, computeResizeSnap } from './snap-guides'
import type { Rect } from './rect'
import type { ResizeLimits } from './resize-anchor'

describe('snapThreshold', () => {
  it('小さい矩形では画面基準28px側が勝つ', () => {
    const rect: Rect = { x: 0, y: 0, w: 100, h: 100 }
    // max(28/1, min(100,100)*0.15=15) = 28
    expect(snapThreshold(rect, 1)).toBe(28)
  })

  it('大きい矩形では寸法基準(短辺15%)側が勝つ', () => {
    const rect: Rect = { x: 0, y: 0, w: 1000, h: 1000 }
    // max(28/1, min(1000,1000)*0.15=150) = 150
    expect(snapThreshold(rect, 1)).toBe(150)
  })

  it('ズームインすると画面基準側の値が縮む', () => {
    const rect: Rect = { x: 0, y: 0, w: 100, h: 100 }
    // max(28/5=5.6, 15) = 15
    expect(snapThreshold(rect, 5)).toBe(15)
  })

  it('短辺(w,hの小さいほう)で寸法基準を計算する', () => {
    const rect: Rect = { x: 0, y: 0, w: 50, h: 1000 }
    // max(28/1, min(50,1000)*0.15=7.5) = 28
    expect(snapThreshold(rect, 1)).toBe(28)
  })
})

describe('computeSnap', () => {
  it('siblings が空なら吸着せず元の座標のまま', () => {
    const dragging: Rect = { x: 10, y: 10, w: 50, h: 50 }
    const result = computeSnap(dragging, [], 100)
    expect(result).toEqual({ x: 10, y: 10, guides: [] })
  })

  it('しきい値内のエッジに吸着し、揃った線ぶんのガイドを返す', () => {
    const dragging: Rect = { x: 10, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 15, y: 100, w: 50, h: 50 }
    const result = computeSnap(dragging, [sibling], 10)
    // x線は ドラッグ 10/35/60、相手 15/40/65。左辺↔左辺・右辺↔右辺・中心↔中心が全て +5 で同率
    expect(result.x).toBe(15)
    // y方向は距離が全てしきい値超なので無変化
    expect(result.y).toBe(0)
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 15, start: -10, end: 160, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 65, start: -10, end: 160, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 40, start: -10, end: 160, type: 'center', extend: 10 },
    ])
  })

  it('しきい値外なら吸着せず座標もガイドも無変化', () => {
    const dragging: Rect = { x: 10, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 200, y: 300, w: 50, h: 50 }
    const result = computeSnap(dragging, [sibling], 5)
    expect(result).toEqual({ x: 10, y: 0, guides: [] })
  })

  it('同率窓の外の相手はガイドに混ぜない(順序に依存しない)', () => {
    const dragging: Rect = { x: 0, y: 0, w: 20, h: 20 }
    const near: Rect = { x: 3, y: 500, w: 20, h: 20 }
    const far: Rect = { x: 4.5, y: 500, w: 20, h: 20 }
    const result = computeSnap(dragging, [near, far], 5)
    expect(result.x).toBe(3)
    expect(result.y).toBe(0)
    // far の候補は |diff| = 4.5 で最小3との差が1.5。同率窓1の外なので1本も出ない
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 3, start: -10, end: 530, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 23, start: -10, end: 530, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 13, start: -10, end: 530, type: 'center', extend: 10 },
    ])

    // siblings の順序を入れ替えても結果は完全一致する
    expect(computeSnap(dragging, [far, near], 5)).toEqual(result)
  })

  it('辺と中心線の交差ペアを作らない', () => {
    const dragging: Rect = { x: 190, y: 0, w: 60, h: 60 }
    const sibling: Rect = { x: 100, y: 0, w: 200, h: 100 }
    const result = computeSnap(dragging, [sibling], 20)
    // 成立するのは中心↔中心(|200-220| = 20)だけ。左辺190↔相手中心200 を拾う総当たり実装なら 200 になる
    expect(result.x).toBe(170)
    // y は 上辺↔上辺の0が最小。中心↔中心の20は同率窓の外で落ちる
    expect(result.y).toBe(0)
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 200, start: -10, end: 110, type: 'center', extend: 10 },
      { axis: 'horizontal', pos: 0, start: 90, end: 310, type: 'edge', extend: 10 },
    ])
  })

  it('同じ位置に揃う複数の相手を1本へ畳む(順序に依存しない)', () => {
    const dragging: Rect = { x: 104, y: 600, w: 80, h: 60 }
    const upper: Rect = { x: 100, y: 0, w: 80, h: 60 }
    const lower: Rect = { x: 100, y: 300, w: 80, h: 60 }
    const result = computeSnap(dragging, [upper, lower], 20)
    expect(result.x).toBe(100)
    expect(result.y).toBe(600)
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 100, start: -10, end: 670, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 180, start: -10, end: 670, type: 'edge', extend: 10 },
      { axis: 'vertical', pos: 140, start: -10, end: 670, type: 'center', extend: 10 },
    ])
    expect(result.guides).toHaveLength(3)

    expect(computeSnap(dragging, [lower, upper], 20)).toEqual(result)
  })

  it('左辺を相手の右辺へ・右辺を相手の左辺へ寄せても辺どうしの吸着になる', () => {
    const sibling: Rect = { x: 0, y: 200, w: 100, h: 50 }
    // 左辺103 ↔ 相手の右辺100
    expect(computeSnap({ x: 103, y: 0, w: 50, h: 50 }, [sibling], 5)).toEqual({
      x: 100,
      y: 0,
      guides: [{ axis: 'vertical', pos: 100, start: -10, end: 260, type: 'edge', extend: 10 }],
    })
    // 右辺-3 ↔ 相手の左辺0
    expect(computeSnap({ x: -53, y: 0, w: 50, h: 50 }, [sibling], 5)).toEqual({
      x: -50,
      y: 0,
      guides: [{ axis: 'vertical', pos: 0, start: -10, end: 260, type: 'edge', extend: 10 }],
    })
  })

  it('y 方向にも吸着し、横向きのガイドは x 方向の区間を覆う', () => {
    const dragging: Rect = { x: 0, y: 103, w: 50, h: 50 }
    const sibling: Rect = { x: 200, y: 0, w: 50, h: 100 }
    // 上辺103 ↔ 相手の下辺100。x は全て離れている
    expect(computeSnap(dragging, [sibling], 5)).toEqual({
      x: 0,
      y: 100,
      guides: [{ axis: 'horizontal', pos: 100, start: -10, end: 260, type: 'edge', extend: 10 }],
    })
  })

  it('最小距離との差がちょうど同率窓(1)の候補は同率に含めない', () => {
    const dragging: Rect = { x: 0, y: 0, w: 20, h: 20 }
    // near は左辺・右辺・中心が全て距離3。far は右辺-4 ↔ ドラッグ左辺0 の距離4だけ
    const near: Rect = { x: 3, y: 500, w: 20, h: 20 }
    const far: Rect = { x: -24, y: 800, w: 20, h: 20 }
    const result = computeSnap(dragging, [near, far], 5)
    expect(result).toEqual({
      x: 3,
      y: 0,
      guides: [
        { axis: 'vertical', pos: 3, start: -10, end: 530, type: 'edge', extend: 10 },
        { axis: 'vertical', pos: 23, start: -10, end: 530, type: 'edge', extend: 10 },
        { axis: 'vertical', pos: 13, start: -10, end: 530, type: 'center', extend: 10 },
      ],
    })
    expect(computeSnap(dragging, [far, near], 5)).toEqual(result)
  })

  it('縦と横のガイドは同じ位置でも別の線として残す', () => {
    const dragging: Rect = { x: 103, y: 103, w: 50, h: 50 }
    const sibling: Rect = { x: 0, y: 0, w: 100, h: 100 }
    expect(computeSnap(dragging, [sibling], 5)).toEqual({
      x: 100,
      y: 100,
      guides: [
        { axis: 'vertical', pos: 100, start: -10, end: 160, type: 'edge', extend: 10 },
        { axis: 'horizontal', pos: 100, start: -10, end: 160, type: 'edge', extend: 10 },
      ],
    })
  })

  it('位置差がちょうど畳み幅(2)の線は畳まない', () => {
    const dragging: Rect = { x: 0, y: 0, w: 20, h: 20 }
    // a は左辺4 ↔ 左辺0(距離4)、b は中心6 ↔ 中心10(距離4)。同率で、線の位置差は2
    const a: Rect = { x: 4, y: 500, w: 100, h: 20 }
    const b: Rect = { x: -44, y: 800, w: 100, h: 20 }
    expect(computeSnap(dragging, [a, b], 5)).toEqual({
      x: 4,
      y: 0,
      guides: [
        { axis: 'vertical', pos: 4, start: -10, end: 530, type: 'edge', extend: 10 },
        { axis: 'vertical', pos: 6, start: -10, end: 830, type: 'center', extend: 10 },
      ],
    })
  })

  it('畳んだ線は区間を和集合に広げ、片方が中心線なら center になる', () => {
    const dragging: Rect = { x: 0, y: 0, w: 20, h: 20 }
    // a は左辺5 ↔ 左辺0 の辺(距離5)、b は中心5 ↔ 中心10 の中心線(距離5)。どちらも位置5
    const a: Rect = { x: 5, y: 500, w: 100, h: 20 }
    const b: Rect = { x: -45, y: 1000, w: 100, h: 20 }
    expect(computeSnap(dragging, [a, b], 6)).toEqual({
      x: 5,
      y: 0,
      guides: [{ axis: 'vertical', pos: 5, start: -10, end: 1030, type: 'center', extend: 10 }],
    })
  })
})

describe('computeResizeSnap', () => {
  const limits: ResizeLimits = { minW: 10, minH: 10, max: 1000 }

  it('ハンドル "e" は x終端のみ吸着し、y側は不変', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 0, y: 100, w: 60, h: 60 }
    const result = computeResizeSnap(resized, [sibling], 15, 'e', {
      minW: 40,
      minH: 40,
      max: 2000,
    })
    expect(result.rect).toEqual({ x: 0, y: 0, w: 60, h: 50 })
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 60, start: -10, end: 170, type: 'edge', extend: 10 },
    ])
  })

  it('ハンドル "nw" は x始点・y始点の両方が吸着し、対辺(右・下)は固定される', () => {
    const resized: Rect = { x: 10, y: 10, w: 50, h: 50 }
    const sibling: Rect = { x: 3, y: 5, w: 10, h: 12 }
    const result = computeResizeSnap(resized, [sibling], 10, 'nw', limits)
    expect(result.rect).toEqual({ x: 8, y: 11, w: 52, h: 49 })
    // 対辺(右=60, 下=60)が固定されていることを確認する
    expect(result.rect.x + result.rect.w).toBe(60)
    expect(result.rect.y + result.rect.h).toBe(60)
    expect(result.guides).toEqual([
      { axis: 'vertical', pos: 8, start: -5, end: 70, type: 'center', extend: 10 },
      { axis: 'horizontal', pos: 11, start: -7, end: 70, type: 'center', extend: 10 },
    ])
  })

  it('最小寸法を割る候補は棄却する(クランプで丸めない)', () => {
    const resized: Rect = { x: 0, y: 0, w: 20, h: 20 }
    const sibling: Rect = { x: 15, y: 100, w: 0, h: 0 }
    const result = computeResizeSnap(resized, [sibling], 20, 'w', limits)
    // アンカーは x=20。候補位置15なら寸法は 20-15 = 5 で minW=10 を割るため候補ごと捨てる
    expect(result.rect).toEqual({ x: 0, y: 0, w: 20, h: 20 })
    expect(result.guides).toEqual([])
  })

  it('会議室の最小寸法では棄却され、家具の最小寸法なら成立する', () => {
    const resized: Rect = { x: 0, y: 0, w: 120, h: 100 }
    const sibling: Rect = { x: 100, y: 300, w: 0, h: 0 }
    // アンカーは x=0、動く辺は x=120、候補位置は100 → 吸着後の寸法は100
    const facility = computeResizeSnap(resized, [sibling], 25, 'e', {
      minW: 105,
      minH: 75,
      max: 2500,
    })
    expect(facility.rect).toEqual({ x: 0, y: 0, w: 120, h: 100 })
    expect(facility.guides).toEqual([])

    const furniture = computeResizeSnap(resized, [sibling], 25, 'e', {
      minW: 40,
      minH: 40,
      max: 2500,
    })
    expect(furniture.rect).toEqual({ x: 0, y: 0, w: 100, h: 100 })
    expect(furniture.guides).toEqual([
      { axis: 'vertical', pos: 100, start: -10, end: 310, type: 'edge', extend: 10 },
    ])
  })

  it('ハンドル "n" は y始点だけ吸着し、x は右辺の近くに線があっても動かない', () => {
    const resized: Rect = { x: 0, y: 10, w: 50, h: 50 }
    // x の線55は右辺50から5、y の線5は上辺10から5
    const sibling: Rect = { x: 55, y: 5, w: 100, h: 200 }
    expect(computeResizeSnap(resized, [sibling], 10, 'n', limits)).toEqual({
      rect: { x: 0, y: 5, w: 50, h: 55 },
      guides: [{ axis: 'horizontal', pos: 5, start: -10, end: 165, type: 'edge', extend: 10 }],
    })
  })

  it('ハンドル "e" は上下の辺の近くに y の線があっても上下を動かさない', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    // x の線55は右辺50から5。y の線-3・53は上辺0・下辺50からそれぞれ3
    const sibling: Rect = { x: 55, y: -3, w: 100, h: 56 }
    expect(computeResizeSnap(resized, [sibling], 10, 'e', limits)).toEqual({
      rect: { x: 0, y: 0, w: 55, h: 50 },
      guides: [{ axis: 'vertical', pos: 55, start: -13, end: 63, type: 'edge', extend: 10 }],
    })
  })

  it('ハンドル "s" は y終点だけ吸着し、上辺は固定される', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 200, y: 55, w: 20, h: 100 }
    expect(computeResizeSnap(resized, [sibling], 10, 's', limits)).toEqual({
      rect: { x: 0, y: 0, w: 50, h: 55 },
      guides: [{ axis: 'horizontal', pos: 55, start: -10, end: 230, type: 'edge', extend: 10 }],
    })
  })

  it('しきい値ちょうどの距離の線には吸着する', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 60, y: 200, w: 0, h: 0 }
    expect(computeResizeSnap(resized, [sibling], 10, 'e', limits).rect).toEqual({
      x: 0,
      y: 0,
      w: 60,
      h: 50,
    })
  })

  it('吸着後の寸法がちょうど最小寸法なら候補に残す', () => {
    const resized: Rect = { x: 0, y: 0, w: 20, h: 20 }
    const sibling: Rect = { x: 10, y: 200, w: 0, h: 0 }
    // アンカーは x=0。候補位置10なら寸法は10で、minW=10 ちょうど
    expect(computeResizeSnap(resized, [sibling], 15, 'e', limits).rect).toEqual({
      x: 0,
      y: 0,
      w: 10,
      h: 20,
    })
  })

  it('左端が0でない矩形でも、右辺の吸着は左端からの寸法で判定・適用する', () => {
    const resized: Rect = { x: 100, y: 0, w: 50, h: 50 }
    // 候補位置160 → 寸法60
    const reach = computeResizeSnap(resized, [{ x: 160, y: 200, w: 0, h: 0 }], 15, 'e', limits)
    expect(reach.rect).toEqual({ x: 100, y: 0, w: 60, h: 50 })
    // 候補位置145 → 寸法45 は minW=50 を割るので棄却
    const short = computeResizeSnap(resized, [{ x: 145, y: 200, w: 0, h: 0 }], 10, 'e', {
      minW: 50,
      minH: 10,
      max: 1000,
    })
    expect(short).toEqual({ rect: resized, guides: [] })
  })

  it('しきい値外なら対辺・制御辺とも無変化でガイドも空', () => {
    const resized: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const sibling: Rect = { x: 500, y: 500, w: 50, h: 50 }
    const result = computeResizeSnap(resized, [sibling], 5, 'se', limits)
    expect(result.rect).toEqual(resized)
    expect(result.guides).toEqual([])
  })
})
