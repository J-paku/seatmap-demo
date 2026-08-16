import { describe, it, expect } from 'vitest'
import { findSpiralSpot } from './spiral-placement'
import type { Rect } from './rect'

const bounds = { width: 1600, height: 1154 }

describe('findSpiralSpot', () => {
  it('遮るものが無ければアンカー中心の矩形をavoid-allで即座に返す', () => {
    const spot = findSpiralSpot({ x: 200, y: 200 }, { width: 100, height: 80 }, bounds, () => false)
    expect(spot).toEqual({ rect: { x: 150, y: 160, w: 100, h: 80 }, stage: 'avoid-all' })
  })

  it('アンカーがフロア外なら内側へクランプしてから探索する', () => {
    const spot = findSpiralSpot({ x: -500, y: -500 }, { width: 100, height: 80 }, bounds, () => false)
    // centerX=clamp(-500,0,1600)=0, centerY=clamp(-500,0,1154)=0
    // offset(0,0)の矩形は x=-50<0 でフロア外のため棄却され、次の格子点まで進む
    expect(spot).not.toBeNull()
    expect(spot!.rect.x).toBeGreaterThanOrEqual(0)
    expect(spot!.rect.y).toBeGreaterThanOrEqual(0)
  })

  it('中心の格子点だけ塞がれていれば、同心リング順で次に近い格子点(左上)を返す', () => {
    const anchor = { x: 200, y: 200 }
    const size = { width: 10, height: 10 }
    // offset(0,0)の矩形(x:195,y:195)だけを塞ぐ
    const spot = findSpiralSpot(anchor, size, bounds, (rect) => rect.x === 195 && rect.y === 195)
    // spiralOffsetsのring1先頭は(dx:-1,dy:-1) → x=200-15-5=180, y=180
    expect(spot).toEqual({ rect: { x: 180, y: 180, w: 10, h: 10 }, stage: 'avoid-all' })
  })

  it('avoid-allとavoid-teamsが常に塞がれていればforced段まで緩めて即座に返す', () => {
    const anchor = { x: 200, y: 200 }
    const size = { width: 100, height: 80 }
    const isBlocked = (_rect: Rect, stage: 'avoid-all' | 'avoid-teams' | 'forced') => stage !== 'forced'
    const spot = findSpiralSpot(anchor, size, bounds, isBlocked)
    expect(spot).toEqual({ rect: { x: 150, y: 160, w: 100, h: 80 }, stage: 'forced' })
  })

  it('矩形がフロアより大きく、どの格子点でも収まらなければ3段とも尽きてnullを返す', () => {
    const tinyBounds = { width: 5, height: 5 }
    const spot = findSpiralSpot({ x: 0, y: 0 }, { width: 10, height: 10 }, tinyBounds, () => false)
    expect(spot).toBeNull()
  })

  it('同じ入力なら常に同じ結果を返す(決定的)', () => {
    const anchor = { x: 123, y: 456 }
    const size = { width: 50, height: 60 }
    const isBlocked = (rect: Rect) => rect.x < 100
    const first = findSpiralSpot(anchor, size, bounds, isBlocked)
    const second = findSpiralSpot(anchor, size, bounds, isBlocked)
    expect(first).toEqual(second)
  })

  it('isBlockedが常にtrueならforced段でも置けずnullを返す', () => {
    const spot = findSpiralSpot({ x: 200, y: 200 }, { width: 10, height: 10 }, { width: 20, height: 20 }, () => true)
    expect(spot).toBeNull()
  })
})
