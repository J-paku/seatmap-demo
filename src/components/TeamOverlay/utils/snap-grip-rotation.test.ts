import { describe, expect, it } from 'vitest'
import { angleToRotation, CLOCKWISE_NEXT } from './snap-grip-rotation'

describe('CLOCKWISE_NEXT', () => {
  it('タップ1回で時計回りに1段進み、270 の次は 0 へ戻る', () => {
    expect(CLOCKWISE_NEXT).toEqual({ 0: 90, 90: 180, 180: 270, 270: 0 })
  })
})

// 画面座標は y 下向き。右=東=90・下=南=0・左=西=270・上=北=180
describe('angleToRotation', () => {
  it.each([
    { name: '右', dx: 30, dy: 0, rotation: 90 },
    { name: '下', dx: 0, dy: 30, rotation: 0 },
    { name: '左', dx: -30, dy: 0, rotation: 270 },
    { name: '上', dx: 0, dy: -30, rotation: 180 },
  ])('真$name へ動かすと $rotation', ({ dx, dy, rotation }) => {
    expect(angleToRotation(dx, dy)).toBe(rotation)
  })

  it.each([
    { name: '右下', dx: 20, dy: 20, rotation: 90 },
    { name: '左下', dx: -20, dy: 20, rotation: 0 },
    { name: '左上', dx: -20, dy: -20, rotation: 270 },
    { name: '右上', dx: 20, dy: -20, rotation: 180 },
  ])('ちょうど斜め($name)は時計回りで先の方角へ丸めて $rotation', ({ dx, dy, rotation }) => {
    expect(angleToRotation(dx, dy)).toBe(rotation)
  })

  it.each([
    { name: '右から少し上', dx: 30, dy: -1, rotation: 90 },
    { name: '右から少し下', dx: 30, dy: 1, rotation: 90 },
    { name: '下から少し右', dx: 1, dy: 30, rotation: 0 },
    { name: '下から少し左', dx: -1, dy: 30, rotation: 0 },
    { name: '左から少し下', dx: -30, dy: 1, rotation: 270 },
    { name: '左から少し上', dx: -30, dy: -1, rotation: 270 },
    { name: '上から少し左', dx: -1, dy: -30, rotation: 180 },
    { name: '上から少し右', dx: 1, dy: -30, rotation: 180 },
  ])('$name へずれても近い方角 $rotation へ寄せる', ({ dx, dy, rotation }) => {
    expect(angleToRotation(dx, dy)).toBe(rotation)
  })

  it.each([
    { name: '右下で右寄り', dx: 30, dy: 29, rotation: 90 },
    { name: '右下で下寄り', dx: 29, dy: 30, rotation: 0 },
    { name: '左下で下寄り', dx: -29, dy: 30, rotation: 0 },
    { name: '左下で左寄り', dx: -30, dy: 29, rotation: 270 },
    { name: '左上で左寄り', dx: -30, dy: -29, rotation: 270 },
    { name: '左上で上寄り', dx: -29, dy: -30, rotation: 180 },
    { name: '右上で上寄り', dx: 29, dy: -30, rotation: 180 },
    { name: '右上で右寄り', dx: 30, dy: -29, rotation: 90 },
  ])('斜めの手前($name)は近い方の $rotation', ({ dx, dy, rotation }) => {
    expect(angleToRotation(dx, dy)).toBe(rotation)
  })
})
