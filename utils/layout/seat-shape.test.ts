import { describe, it, expect } from 'vitest'
import { applySeatShape } from './seat-shape'
import type { Seat } from '@/types'

const baseSeat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 's-1',
  teamId: 'team-01',
  x: 100,
  y: 200,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  shape: 'standard',
  ...overrides,
})

describe('applySeatShape', () => {
  it('standard 形状・回転0は既定サイズ105×75をそのまま当て、位置は変わらない', () => {
    const seat = baseSeat({ shape: 'vertical', width: 75, height: 105, x: 100, y: 200 })
    const result = applySeatShape(seat, 'standard')
    expect(result.width).toBe(105)
    expect(result.height).toBe(75)
    // baseW=105,baseH=75 で turned=false なので x/y のオフセットは0
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
    expect(result.shape).toBe('standard')
  })

  it('executive 形状は110×90を当てる', () => {
    const seat = baseSeat({ shape: 'standard', width: 105, height: 75 })
    const result = applySeatShape(seat, 'executive')
    expect(result.width).toBe(110)
    expect(result.height).toBe(90)
  })

  it('vertical 形状は75×105を当てる', () => {
    const seat = baseSeat({ shape: 'standard', width: 105, height: 75 })
    const result = applySeatShape(seat, 'vertical')
    expect(result.width).toBe(75)
    expect(result.height).toBe(105)
  })

  it('回転90(四分位回転)は幅高さを交換し、中心を保つ位置補正を入れる', () => {
    const seat = baseSeat({ shape: 'vertical', rotation: 90, x: 100, y: 200, width: 75, height: 105 })
    const result = applySeatShape(seat, 'standard')
    // baseW=105,baseH=75、turned=true なので width=baseH=75, height=baseW=105
    expect(result.width).toBe(75)
    expect(result.height).toBe(105)
    // x = seat.x + (baseW-width)/2 = 100 + (105-75)/2 = 115
    expect(result.x).toBe(115)
    // y = seat.y + (baseH-height)/2 = 200 + (75-105)/2 = 185
    expect(result.y).toBe(185)
  })

  it('回転270も回転90と同じ四分位回転として扱う', () => {
    const seat = baseSeat({ shape: 'vertical', rotation: 270, x: 100, y: 200, width: 75, height: 105 })
    const result = applySeatShape(seat, 'standard')
    expect(result.width).toBe(75)
    expect(result.height).toBe(105)
    expect(result.x).toBe(115)
    expect(result.y).toBe(185)
  })

  it('回転180は四分位回転扱いにならず、幅高さを交換しない', () => {
    const seat = baseSeat({ shape: 'vertical', rotation: 180, x: 100, y: 200, width: 75, height: 105 })
    const result = applySeatShape(seat, 'standard')
    expect(result.width).toBe(105)
    expect(result.height).toBe(75)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('isSizeOverridden=true かつ shape が既に同じなら同一参照を返す', () => {
    const seat = baseSeat({ shape: 'standard', isSizeOverridden: true, width: 999, height: 999 })
    const result = applySeatShape(seat, 'standard')
    expect(result).toBe(seat)
  })

  it('isSizeOverridden=true では shape だけ差し替え、サイズ・位置は上書きしない', () => {
    const seat = baseSeat({ shape: 'standard', isSizeOverridden: true, width: 999, height: 888, x: 10, y: 20 })
    const result = applySeatShape(seat, 'executive')
    expect(result.shape).toBe('executive')
    expect(result.width).toBe(999)
    expect(result.height).toBe(888)
    expect(result.x).toBe(10)
    expect(result.y).toBe(20)
    expect(result).not.toBe(seat)
  })

  it('shape・サイズとも変化がなければ同一参照を返す(undo を積ませない)', () => {
    const seat = baseSeat({ shape: 'standard', width: 105, height: 75, rotation: 0 })
    const result = applySeatShape(seat, 'standard')
    expect(result).toBe(seat)
  })

  it('shape が同じでも回転で幅高さが変わるなら新しい参照を返す', () => {
    const seat = baseSeat({ shape: 'standard', width: 105, height: 75, rotation: 90 })
    const result = applySeatShape(seat, 'standard')
    expect(result).not.toBe(seat)
    expect(result.width).toBe(75)
    expect(result.height).toBe(105)
  })
})
